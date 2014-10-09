require([
	'dojo/_base/declare',
	'put-selector/put',
	'dojo/on',
	'dojo/_base/lang',
	'dojo/string',
	'dojo/parser',
	'dojo/query',
	'dojo/dom',
	'dojo/dom-style',
	'dojo/_base/fx',
	'dojo/fx/easing',
	'dstore/Memory',
	'dstore/RequestMemory',
	'dstore/Trackable',
	'dstore/Tree',
	'dojo/date/locale',
	'dojo/date/stamp',
	'dgrid/Tree',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dgrid/extensions/ColumnResizer',
	'dstore/legacy/DstoreAdapter',
	'dijit/registry',
	'dijit/Tooltip',
	'dojox/widget/FisheyeLite',
	'dojox/analytics/Urchin',
	'dgrid/Selection',
	'dgrid/Keyboard',
	'dgrid/extensions/DijitRegistry',
	'demos/mail//Mail',
	'dojo/topic',
	// Widgets in template
	'dijit/Dialog',
	'dijit/Toolbar',
	'dijit/Calendar',
	'dijit/ColorPalette',
	'dijit/Editor',
	'dijit/ProgressBar',
	'dijit/form/ComboButton',
	'dijit/form/ComboBox',
	'dijit/form/CheckBox',
	'dijit/form/Textarea',
	'dijit/form/TextBox',
	'dijit/form/FilteringSelect',
	'dijit/form/Form',
	'dijit/layout/BorderContainer',
	'dijit/layout/AccordionContainer',
	'dijit/layout/TabContainer',
	'dijit/layout/ContentPane',
	'dijit/Menu',
	'dijit/layout/AccordionPane',
	'dojo/domReady!'
], function (
	declare,
	put,
	on,
	lang,
	string,
	parser,
	query,
	dom,
	domStyle,
	fx,
	easing,
	Memory,
	RequestMemory,
	Trackable,
	dstoreTree,
	locale,
	stamp,
	Tree,
	OnDemandGrid,
	Editor,
	ColumnResizer,
	DstoreAdapter,
	registry,
	Tooltip,
	FisheyeLite,
	Urchin,
	Selection,
	Keyboard,
	DijitRegistry,
	Mail,
	topic
) {
	parser.parse();
	var FolderStore = declare([RequestMemory, dstoreTree]),
		ContactStore = declare([Trackable, RequestMemory]),
		FolderTree = declare([OnDemandGrid, Tree, Selection, Keyboard]),
		MessageGrid = declare([OnDemandGrid, Selection, Keyboard, ColumnResizer, DijitRegistry]),
		ContactGrid = declare([OnDemandGrid, Editor, Selection, Keyboard, ColumnResizer, DijitRegistry]),
		folderTree,
		messagesGrid,
		contactGrid,
		mailStore,
		contactStore,
		lagacyStore,
		tabs = registry.byId('tabs'),
		contactsTab = registry.byId('contactsTab'),
		inboxTab = registry.byId('inbox'),
		searchForm = registry.byId('searchForm'),
		fakeFetch = registry.byId('fakeFetch');

	// make tooltips go down (from buttons on toolbar) rather than to the right
	Tooltip.defaultPosition = ['above', 'below'];

	new Urchin({
		acct: 'UA-3572741-1',
		GAonLoad: function () {
			this.trackPageView('/demos/dijitmail');
		}
	});

	fakeFetch.report = function (percent) {
		if (this.indeterminate) {
			return ' conecting.';
		}
		return string.substitute('Fetching: ${0} of ${1} messages.', [percent * this.maximum, this.maximum]);
	};

	// Events
	searchForm.on('submit', searchMessages);
	registry.byId('newMsg').on('click', newMessage);
	registry.byId('options').on('click', function () {
		registry.byId('optionsDialog').show();
	});
	registry.byId('getMail').on('click', fakeDownload);

	topic.subscribe('mail/showSendBar', showSendBar);
	topic.subscribe('mail/closeMail', function () {
		tabs.closeChild(tabs.selectedChildWidget);
	});

	mailStore = new FolderStore({target: 'mail.json'});

	contactStore = new ContactStore({target: 'contacts.php'});

	contactStore.filter().fetch().then(function (data) {
		lagacyStore = new DstoreAdapter(new Memory({
			identifier: 'id',
			label: 'display',
			data: data
		}));
	});

	// Write A-Z "links" on contactIndex tab to do filtering
	genIndex();

	createMessageGrid();
	createFolderTree();
	createContactGrid();

	fx.fadeOut({
		node: 'preLoader',
		duration:720,
		onEnd:function () {
			domStyle.set('preLoader', 'display', 'none');
		}
	}).play();

	function createFolderTree () {
		folderTree = new FolderTree({
			collection: mailStore.filter({parent: '0', type: 'folder'}),
			showHeader: false,
			selectionMode: 'single',
			shouldExpand: function (row, level, previouslyExpanded) {
				if (level === 0) {
					return true;
				}
				return previouslyExpanded;
			},
			columns: [
				{
					renderExpando: true,
					label: 'Folder',
					field: 'label',
					sortable: false,
					renderCell: function (object, value, td) {
						if (object.icon) {
							td.appendChild(put('div.icon.' + object.icon));
						}
						td.appendChild(document.createTextNode(value));
					}
				}
			]
		}, 'folderTree');

		folderTree.on('dgrid-select', function (event) {
			// summary:
			//		when user clicks a folder in the left pane filter the message to the folder
			var cell = event.rows[0],
				type = cell.data.label,
				filter = {
					type: 'message',
					folder: type
				};

			messagesGrid.set('collection', mailStore.filter(filter));
		});
	}

	function createMessageGrid () {
		messagesGrid = new MessageGrid({
			id: 'messageGrid',
			collection: mailStore.filter({ type: 'message' }),
			region: 'top',
			minSize: 115,
			splitter: true,
			selectionMode: 'single',
			columns: {
				sender: 'Sender',
				label: 'Subject',
				sent: {
					label: 'Date',
					formatter: function (value) {
						return locale.format(stamp.fromISOString(value), { selector: 'date' });
					}
				}
			}
		});

		inboxTab.addChild(messagesGrid);

		domStyle.set(messagesGrid.domNode, 'height', '115px');
		inboxTab.resize();

		messagesGrid.on('dgrid-select', function (event) {
			// summary:
			//		when user clicks a row in the message grid pane
			var cell = event.rows[0],
				item = cell.data,
				sent = locale.format(
					stamp.fromISOString(item.sent), { formatLength: 'long', selector: 'date' }
				),
				messageInner = '<span class="messageHeader">From: ' + item.sender + '<br>' +
					'Subject: ' + item.label + '<br>' +
					'Date: ' + sent + '<br><br></span>' +
					item.text;
			registry.byId('message').set('content', messageInner);
		});
	}

	function createContactGrid () {
		contactGrid = new ContactGrid({
			region: 'center',
			collection: contactStore,
			columns: [
				{
					label: 'First',
					field: 'first',
					editor: 'text',
					editOn: 'dblclick'
				},
				{
					label: 'Last',
					field: 'last',
					editor: 'text',
					editOn: 'dblclick'
				},
				{
					label: 'Email',
					field: 'email',
					editor: 'text',
					editOn: 'dblclick'
				}
			]
		});

		contactsTab.addChild(contactGrid);

		contactGrid.on('dgrid-datachange', function (event) {
			// summary:
			//		update the item display property for the new message combobox
			var cell = event.cell,
				field = cell.column.field,
				data = cell.row.data,
				value = event.value,
				first = field === 'first' ? value : data.first,
				last  = field === 'last' ? value : data.last,
				email  = field === 'email' ? value : data.email;

			contactStore.get(cell.row.id).then(function (item) {
				// update display
				item[field] = value;
				item.display = first + ' ' + last + ' <' + email + '>';
			});
		});
	}

	function genIndex () {
		// summary:
		//		generate A-Z push buttons for navigating contact list
		var ci = dom.byId('contactIndex');

		function addChar (c, func, cls) {
			// add specified character, when clicked will execute func
			var span = document.createElement('span');
			span.innerHTML = c;
			span.className = cls || 'contactIndex';
			ci.appendChild(span);
			new FisheyeLite(
				{
					properties: {fontSize: 1.5},
					easeIn: easing.linear,
					durationIn: 100,
					easeOut: easing.linear,
					durationOut: 100
				},
				span
			);

			on(span, 'click', func || function () {
				contactGrid.set('collection', contactStore.filter({first: new RegExp(c, 'i')}));
			});
			on(span, 'click', function () {
				query('>', ci).removeClass('contactIndexSelected');
				put(span, '.contactIndexSelected');
			});
		}

		addChar('ALL', function () {
			contactGrid.set('collection', contactStore);
		}, 'contactIndexAll');

		for (var l = 'A'.charCodeAt(0); l <= 'Z'.charCodeAt(0); l++) {
			addChar(String.fromCharCode(l));
		}

		addChar('ALL', function () {
			contactGrid.set('collection', contactStore);
		}, 'contactIndexAll');
	}

	var paneId = 1;
	function searchMessages (event) {
		// summary:
		//		do a custom search for messages across inbox folders
		event.preventDefault();
		var query = { type: 'message' };
		var searchCriteria = searchForm.get('value');
		for (var key in searchCriteria) {
			var val = searchCriteria[key];
			if (val) {
				query[key] = new RegExp(val, 'i');
			}
			
		}
		messagesGrid.set('collection', mailStore.filter(query));
	}

	function newMessage () {
		/* make a new tab for composing the message */
		var newTab = new Mail({
			id: 'new'+paneId,
			title: 'New Message #' + paneId++,
			lagacyStore: lagacyStore
		});

		tabs.addChild(newTab);
		tabs.selectChild(newTab);
	}

	// fake mail download code:
	var numMails;
	function updateFetchStatus (x) {
		if (x === 0) {
			fakeFetch.update({ indeterminate: false });
			return;
		}
		fakeFetch.update({ progress: x + 1 });
		if (x === numMails) {
			fx.fadeOut({ node: 'fetchMail', duration: 800,
				// set progress back to indeterminate. we're cheating, because this
				// doesn't actually have any data to "progress"
				onEnd: function () {
					fakeFetch.update({ indeterminate: true });
					domStyle.set('fetchMail', 'visibility', 'hidden'); // remove progress bar from tab order
				}
			}).play();
		}
	}

	function fakeDownload () {
		domStyle.set('fetchMail', 'visibility', 'visible');
		numMails = Math.floor(Math.random() * 10) + 1;
		fakeFetch.update({ maximum: numMails, progress: 0 });
		fx.fadeIn({ node: 'fetchMail', duration: 300 }).play();
		for (var ii = 0; ii < numMails + 1; ++ii) {
			var func = lang.partial(updateFetchStatus, ii);
			setTimeout(func,  ((ii + 1) * (Math.floor(Math.random() * 100) + 400)));
		}
	}

	// fake sending dialog progress bar
	function stopSendBar () {
		registry.byId('fakeSend').update({ indeterminate: false });
		registry.byId('sendDialog').hide();
		tabs.selectedChildWidget.onClose = function () {
			// don't want confirm message
			return true;
		};
		tabs.closeChild(tabs.selectedChildWidget);
	}

	function showSendBar () {
		registry.byId('fakeSend').update({ indeterminate: true });
		registry.byId('sendDialog').show();
		setTimeout(function () {
			stopSendBar();
		}, 3000);
	}
});

