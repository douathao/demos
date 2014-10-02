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
	'dojo/dom-class',
	'dojo/_base/fx',
	'dojo/fx/easing',
	'dstore/Memory',
	'dstore/RequestMemory',
	'dstore/Tree',
	'dojo/date/locale',
	'dojo/date/stamp',
	'dgrid/Tree',
	'dgrid/OnDemandGrid',
	'dgrid/Editor',
	'dstore/legacy/DstoreAdapter',
	'dijit/registry',
	'dijit/Tooltip',
	'dojox/widget/FisheyeLite',
	'dojox/analytics/Urchin',
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
	'dijit/_editor/plugins/LinkDialog',
	'dijit/Menu',
	'dijit/_editor/plugins/FontChoice',
	'dijit/layout/AccordionPane',
	'dijit/Declaration',
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
	domClass,
	fx,
	easing,
	Memory,
	RequestMemory,
	dstoreTree,
	locale,
	stamp,
	Tree,
	OnDemandGrid,
	Editor,
	DstoreAdapter,
	registry,
	Tooltip,
	FisheyeLite,
	Urchin
) {
	parser.parse();
	var FolderStore = declare([RequestMemory, dstoreTree]),
		mailStore,
		contactStore,
		folderTree,
		messagesList,
		contactGrid,
		lagacyStore,
		tabs = registry.byId('tabs');

	dom.setSelectable('folderTree', false);

	// make tooltips go down (from buttons on toolbar) rather than to the right
	Tooltip.defaultPosition = ['above', 'below'];

	new Urchin({
		acct: 'UA-3572741-1',
		GAonLoad: function(){
			this.trackPageView('/demos/dijitmail');
		}
	});

	registry.byId('fakeFetch').report = function (percent){
		if (this.indeterminate) { return ' conecting.'; }
		return string.substitute('Fetching: ${0} of ${1} messages.', [percent * this.maximum, this.maximum]);
	};

	// Events
	on(dom.byId('search'), 'click', searchMessages);
	on(dom.byId('newMsg'), 'click', newMessage);
	on(dom.byId('options'), 'click', function () {
		registry.byId('optionsDialog').show();
	});
	on(dom.byId('getMail'), 'click', fakeDownload);

	init();

	function init() {
		var ContactStore = declare([RequestMemory]);

		mailStore = new FolderStore({target: '/demos/mail/mail.json'});

		contactStore = new ContactStore({target: '/demos/mail/contacts.php'});

		// Write A-Z "links" on contactIndex tab to do filtering
		genIndex();

		createMessageList();

		createFolderList();

		tabs.watch('selectedChildWidget', function(name, oval, nval){
			// Prevent the contact grid from some weird rendering.
			if (nval.title === 'Contacts' && contactGrid === undefined) {
				createContactList();
			}
		});

		fx.fadeOut({
			node: 'preLoader',
			duration:720,
			onEnd:function(){
				domStyle.set('preLoader', 'display', 'none');
			}
		}).play();
	}

	function createFolderList () {
		var FolderTree = declare([OnDemandGrid, Tree]);

		folderTree = new FolderTree({
			collection: mailStore.filter({parent: '0', type: 'folder'}),
			showHeader: false,
			className: 'dgrid-autoheight',
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
							td.appendChild(put('div.' + object.icon + '[style=px;width:16px;height:16px; float:left]'));
						}
						td.appendChild(document.createTextNode(value));
					}
				}
			]
		}, 'folderTree');

		folderTree.on('.dgrid-cell:click', function (event) {
			// summary:
			//		when user clicks a folder in the left pane filter the message to the folder
			var cell = folderTree.cell(event),
				type = cell.row.data.label,
				filter = {
					type: 'message',
					folder: type
				};

			if (type !== 'Save' && type !== 'Folders') {
				messagesList.set('collection', mailStore.filter(filter));
			}

		});
	}

	function createMessageList () {
		messagesList = new OnDemandGrid({
			collection: mailStore.filter({type: 'message'}),
			className: 'dgrid-autoheight',
			columns: {
				sender: 'Sender',
				label: 'Subject',
				date: {
					label: 'Date',
					width: '10%',
					formatter: function(value, object){
						return locale.format(stamp.fromISOString(object.sent), {selector: 'date'});
					}
				}
			}
		}, 'messagesList');

		messagesList.on('.dgrid-cell:click', function (event) {
			// summary:
			//		when user clicks a row in the message list pane
			var cell = messagesList.cell(event),
				item = cell.row.data,
				sent = locale.format(
					stamp.fromISOString(item.sent),
					{formatLength: 'long', selector: 'date'}),
				messageInner = '<span class="messageHeader">From: ' + item.sender + '<br>' +
					'Subject: ' + item.label + '<br>' +
					'Date: ' + sent + '<br><br></span>' +
					item.text;
			registry.byId('message').setContent(messageInner);
		});
	}

	function createContactList () {
		var ContactGrid = declare([OnDemandGrid, Editor]);
		contactGrid = new ContactGrid({
			collection: contactStore.filter({}),
			className: 'dgrid-autoheight',
			columns: [
				{
					label: 'First',
					field: 'first',
					editor: 'text',
					autoSave: true,
					editOn: 'dblclick'
				},
				{
					label: 'Last',
					field: 'last',
					editor: 'text',
					autoSave: true,
					editOn: 'dblclick'
				},
				{
					label: 'Email',
					field: 'email',
					editor: 'text',
					autoSave: true,
					editOn: 'dblclick'
				}
			]
		}, 'contactGrid');

		contactGrid.on('dgrid-datachange', function (event) {
			// summary:
			//		update the item display property for the new message combobox
			var cell = event.cell,
				field = cell.column.field,
				data = cell.row.data,
				value = event.value,
				first = field === 'first' ? value : data.first,
				last  = field === 'last' ? value : data.last;

			if (field === 'first' || field === 'last') {
				contactStore.get(event.rowId).then(function (item) {
					// update display
					item[field] = value;
					item.display = first + ' ' + last + ' <' + item.email + '>';
					return item;
				}).then(function (item) {
					// save data
					contactStore.put(item);
				});
			}
		});
	}

	function genIndex(){
		// summary:
		//		generate A-Z push buttons for navigating contact list
		var ci = dom.byId('contactIndex');

		function addChar(c, func, cls){
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

			on(span, 'click', func || function() {
				contactGrid.set('collection', contactStore.filter({first: new RegExp(c + '.')}));
			});
			on(span, 'click', function(){
				query('>', ci).removeClass('contactIndexSelected');
				domClass.add(span, 'contactIndexSelected');
			});
		}

		addChar('ALL', function(){
			contactGrid.set('collection', contactStore.filter({}));
		}, 'contactIndexAll' );

		for(var l = 'A'.charCodeAt(0); l <= 'Z'.charCodeAt(0); l++){
			addChar(String.fromCharCode(l));
		}

		addChar('ALL', function(){
			contactGrid.set('collection', contactStore.filter({}));
		}, 'contactIndexAll' );
	}

	var paneId = 1;
	function searchMessages(){
		// summary:
		//		do a custom search for messages across inbox folders
		var query = {type: 'message'};
		var searchCriteria = dom.byId('searchForm').attr('value');
		for(var key in searchCriteria){
			var val = searchCriteria[key];
			if(val){
				query[key] = new RegExp(val +'.', 'i');
			}
			
		}
		messagesList.set('collection', mailStore.filter(query));
	}

	function newMessage () {
		/* make a new tab for composing the message */
		var newTab = new mail.NewMessage({
			id: 'new'+paneId,
			postCreate: function () {
				var self = this;
				contactStore.filter().fetch().then(function (data) {
					lagacyStore = new DstoreAdapter(new Memory({
						identifier: 'id',
						label: 'display',
						data: data
					}));
					self.to.set('store', lagacyStore);
				});

				this.own(
					on(this.okButton, 'click', lang.hitch(this, function () {
						if (this.to.get('value') === '') {
							alert('Please enter a recipient address');
						} else {
							showSendBar();
						}
					})),
					on(this.cancelButton, 'click', function () {
						tabs.closeChild(tabs.selectedChildWidget);
					})
				);
			}
		}).container;

		lang.mixin(newTab,
			{
				title: 'New Message #' + paneId++,
				closable: true,
				onClose: testClose
			}
		);
		tabs.addChild(newTab);
		tabs.selectChild(newTab);
	}

	// for "new message" tab closing
	function testClose (){
		return confirm('Are you sure you want to leave your changes?');
	}

	// fake mail download code:
	var numMails;
	function updateFetchStatus (x){
		if(x === 0){
			registry.byId('fakeFetch').update({ indeterminate: false });
			return;
		}
		registry.byId('fakeFetch').update({ progress: x + 1 });
		if(x === numMails){
			fx.fadeOut({ node: 'fetchMail', duration:800,
				// set progress back to indeterminate. we're cheating, because this
				// doesn't actually have any data to "progress"
				onEnd: function(){
					registry.byId('fakeFetch').update({ indeterminate: true });
					domStyle.set('fetchMail', 'visibility', 'hidden'); // remove progress bar from tab order
				}
			}).play();
		}
	}

	function fakeDownload (){
		domStyle.set('fetchMail', 'visibility', 'visible');
		numMails = Math.floor(Math.random()*10) + 1;
		registry.byId('fakeFetch').update({ maximum: numMails, progress:0 });
		fx.fadeIn({ node: 'fetchMail', duration:300 }).play();
		for(var ii = 0; ii < numMails + 1; ++ii){
			var func = lang.partial(updateFetchStatus, ii);
			setTimeout(func,  ((ii + 1) * (Math.floor(Math.random()*100) + 400)));
		}
	}

	// fake sending dialog progress bar
	function stopSendBar (){
		registry.byId('fakeSend').update({ indeterminate: false });
		registry.byId('sendDialog').hide();
		tabs.selectedChildWidget.onClose = function(){return true;};  // don't want confirm message
		tabs.closeChild(tabs.selectedChildWidget);
	}

	function showSendBar (){
		registry.byId('fakeSend').update({ indeterminate: true });
		registry.byId('sendDialog').show();
		setTimeout(function(){stopSendBar();}, 3000);
	}
});

