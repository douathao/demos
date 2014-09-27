require([
	"dojo/io-query", "dojo/query", "dojo/on", "dojo/_base/array", "dojo/number", "dojo/_base/fx", "dojo/dom", "dojo/dom-class", "dojo/dom-geometry", "dojo/dom-style",
	"dojo/hccss", "dojo/date/locale", "dojo/parser", "dojo/store/Memory",
	"dijit/registry", "dijit/tree/ObjectStoreModel",

	"dijit/CheckedMenuItem", "dijit/RadioMenuItem", "dijit/MenuSeparator",

	// dgrid
	"dstore/Memory",
	"dgrid/OnDemandGrid",

	// chart
	"dojox/charting/Chart", "dojox/charting/plot2d/Pie", "dojox/charting/action2d/Highlight",
	"dojox/charting/action2d/MoveSlice" , "dojox/charting/action2d/Tooltip",
	"dojox/charting/themes/MiamiNice", "dojox/charting/widget/Legend",

	// Editors used by InlineEditBox.  Must be pre-loaded.
	"dijit/form/Textarea", "dijit/form/DateTextBox", "dijit/form/TimeTextBox", "dijit/form/FilteringSelect",

	// These plugins are used by the Editor, and need to be pre-loaded
	"dijit/_editor/plugins/LinkDialog", // for createLink
	"dijit/_editor/plugins/FontChoice", // for fontName

	// Modules referenced by the parser
	"dijit/Menu", "dijit/PopupMenuItem", "dijit/ColorPalette", "dijit/layout/BorderContainer", "dijit/MenuBar",
	"dijit/PopupMenuBarItem", "dijit/layout/AccordionContainer", "dijit/layout/ContentPane", "dijit/TooltipDialog",
	"dijit/Tree", "dijit/layout/TabContainer", "dijit/form/ComboButton", "dijit/form/ToggleButton",
	"dijit/form/CheckBox", "dijit/form/RadioButton", "dijit/form/CurrencyTextBox", "dijit/form/NumberSpinner",
	"dijit/form/Select", "dijit/Editor", "dijit/form/VerticalSlider", "dijit/form/VerticalRuleLabels",
	"dijit/form/VerticalRule", "dijit/form/HorizontalSlider", "dijit/form/HorizontalRuleLabels",
	"dijit/form/HorizontalRule", "dijit/TitlePane", "dijit/ProgressBar", "dijit/InlineEditBox", "dojo/dnd/Source",
	"dijit/Dialog",

	// Don't call the parser until the DOM has finished loading
	"dojo/domReady!"
], function(ioQuery, query, on, array, number, baseFx, dom, domClass, domGeom, domStyle, has, locale, parser, Memory, registry, ObjectStoreModel,
			CheckedMenuItem, RadioMenuItem, MenuSeparator, DstoreMemory, OnDemandGrid, Chart, Pie, Highlight, MoveSlice, Tooltip, MiamiNice, Legend){
	// If you are doing box-model sizing then need to tell dom-geometry, see #15104
	if(domStyle.get(document.body, "boxSizing") == "border-box" ||
		domStyle.get(document.body, "MozBoxSizing") == "border-box"){
		domGeom.boxModel = "border-box";
	}

	// Data for Tree, ComboBox, InlineEditBox
	var data = [
		{ id: "earth", name: "The earth", type: "planet", population: "6 billion"},
		{ id: "AF", name: "Africa", type: "continent", population: "900 million", area: "30,221,532 sq km",
			timezone: "-1 UTC to +4 UTC", parent: "earth"},
		{ id: "EG", name: "Egypt", type: "country", parent: "AF" },
		{ id: "KE", name: "Kenya", type: "country", parent: "AF" },
		{ id: "Nairobi", name: "Nairobi", type: "city", parent: "KE" },
		{ id: "Mombasa", name: "Mombasa", type: "city", parent: "KE" },
		{ id: "SD", name: "Sudan", type: "country", parent: "AF" },
		{ id: "Khartoum", name: "Khartoum", type: "city", parent: "SD" },
		{ id: "AS", name: "Asia", type: "continent", parent: "earth" },
		{ id: "CN", name: "China", type: "country", parent: "AS" },
		{ id: "IN", name: "India", type: "country", parent: "AS" },
		{ id: "RU", name: "Russia", type: "country", parent: "AS" },
		{ id: "MN", name: "Mongolia", type: "country", parent: "AS" },
		{ id: "OC", name: "Oceania", type: "continent", population: "21 million", parent: "earth"},
		{ id: "AU", name: "Australia", type: "country", population: "21 million", parent: "OC"},
		{ id: "EU", name: "Europe", type: "continent", parent: "earth" },
		{ id: "DE", name: "Germany", type: "country", parent: "EU" },
		{ id: "FR", name: "France", type: "country", parent: "EU" },
		{ id: "ES", name: "Spain", type: "country", parent: "EU" },
		{ id: "IT", name: "Italy", type: "country", parent: "EU" },
		{ id: "NA", name: "North America", type: "continent", parent: "earth" },
		{ id: "MX", name: "Mexico", type: "country", population: "108 million", area: "1,972,550 sq km",
			parent: "NA" },
		{ id: "Mexico City", name: "Mexico City", type: "city", population: "19 million", timezone: "-6 UTC", parent: "MX"},
		{ id: "Guadalajara", name: "Guadalajara", type: "city", population: "4 million", timezone: "-6 UTC", parent: "MX" },
		{ id: "CA", name: "Canada", type: "country", population: "33 million", area: "9,984,670 sq km", parent: "NA" },
		{ id: "Ottawa", name: "Ottawa", type: "city", population: "0.9 million", timezone: "-5 UTC", parent: "CA"},
		{ id: "Toronto", name: "Toronto", type: "city", population: "2.5 million", timezone: "-5 UTC", parent: "CA" },
		{ id: "US", name: "United States of America", type: "country", parent: "NA" },
		{ id: "SA", name: "South America", type: "continent", parent: "earth" },
		{ id: "BR", name: "Brazil", type: "country", population: "186 million", parent: "SA" },
		{ id: "AR", name: "Argentina", type: "country", population: "40 million", parent: "SA" }
	];

	// Create test store.
	continentStore = new Memory({
		data: data
	});

	// Since dojo.store.Memory doesn't have various store methods we need, we have to add them manually
	continentStore.getChildren = function(object){
		// Add a getChildren() method to store for the data model where
		// children objects point to their parent (aka relational model)
		return this.query({parent: this.getIdentity(object)});
	};

	// Create the model for the Tree
	continentModel = new ObjectStoreModel({store: continentStore, query: {id: "earth"}});

	// Switch theme base on query theme
	var queries = ioQuery.queryToObject(location.search.slice(1)),
		theme,
		dir;
	if (queries.theme) {
		// load the theme
		theme = queries.theme;
		if (queries.dir) {
			query('link')[2].href = '../../dijit/themes/' + theme + '/' + theme + '_rtl.css';
		}
	}
	else {
		// default to claro
		theme = 'claro';
	}
	query('link')[0].href = '../../dijit/themes/' + theme + '/document.css';
	query('link')[1].href = '../../dijit/themes/' + theme + '/' + theme + '.css';
	// dgrid
	query('link')[3].href = '../../dgrid/css/skins/' + theme + '.css';

	domClass.add(document.body, theme);

	parser.parse(document.body).then(function(){
		var dialogAB = registry.byId('dialogAB'),
			dialog1 = registry.byId('dialog1'),
			themeMenu = registry.byId('themeMenu'),
			areaEditable = registry.byId('areaEditable'),
			// current setting (if there is one) to override theme default padding on TextBox based widgets
			currentInputPadding = "",
			// availableThemes[] is just a list of 'official' dijit themes, you can use ?theme=String
			// for 'un-supported' themes, too. (eg: yours)
			availableThemes = [
				{ theme: "claro", author: "Dojo", baseUri: "../themes/" },
				{ theme: "tundra", author: "Dojo", baseUri: "../themes/" },
				{ theme: "soria", author: "nikolai", baseUri: "../themes/" },
				{ theme: "nihilo", author: "nikolai", baseUri: "../themes/" }
			],
			// Get current theme, a11y, and dir setting for page
			curTheme = location.search.replace(/.*theme=([a-z]+).*/, "$1") || "claro",
			a11y = has("highcontrast") || /a11y=true/.test(location.search),
			rtl = document.body.parentNode.dir == "rtl",
			tmpString = '',
			nineAm = new Date(0),
			// dgrid
			grid,
			collection = new DstoreMemory({data: data});

		// Events
		on(contextMenuEnable, 'click', function () {
			alert('Hello world');
		});
		query('.consoleLog', document.body).on('click', function (event) {
			console.log(event.target.parentNode.getAttribute('data-message'));
		});
		query('.subMenu', popupContextMenu.domNode).on('click', function (event) {
			alert(event.target.innerHTML + '!');
		});
		query('.showLoading', document.body).on('click', showDialog);
		query('.actionBar', document.body).on('click', showDialogAb);
		on(inputPaddingDefault, 'click', setTextBoxPadding);
		on(inputPadding1, 'click', setTextBoxPadding);
		on(inputPadding2, 'click', setTextBoxPadding);
		on(inputPadding3, 'click', setTextBoxPadding);
		on(inputPadding4, 'click', setTextBoxPadding);
		on(inputPadding5, 'click', setTextBoxPadding);
		on(registry.byId('colorPalette'), 'change', setBackground);
		on(registry.byId('colorPalette2'), 'change', setBackground);
		on(simpleButton, 'click', function () {
			console.debug('clicked simple');
		});
		on(editMenu1, 'click', function () {
			console.debug('not actually cutting anything, just a test!');
		});
		on(editMenu2, 'click', function () {
			console.debug('not actually copying anyything, just a test!');
		});
		on(editMenu3, 'click', function () {
			console.debug('not actually pasting anyything, just a test!');
		});
		on(editMenu4, 'click', function () {
			console.log("clicked combo save");
		});
		on(saveMenu1, 'click', function () {
			console.debug('not actually saving anything, just a test!');
		});
		on(saveMenu2, 'click', function () {
			console.debug('not actually saving anything, just a test!');
		});
		on(registry.byId('toggleButton'), 'change', function (a) {
			console.log('toggle button checked=' + a)
		});
		on(ABdialog1button2, 'click', function () {
			dialogAB.onCancel();
		});
		on(registry.byId('slider2'), 'change', function (a) {
			slider2input.value = a;
		});
		on(registry.byId('horizontal1'), 'change', function (a) {
			slider1input.value = number.format(a / 100, { places:1, pattern:'#%' })
		});
		on(disableEditable, 'click', function () {
			areaEditable.set('disabled', true)
		});
		on(enableEditable, 'click', function () {
			areaEditable.set('disabled', false)
		});

		topTabs.watch("selectedChildWidget", function(name, oval, nval){
			// Prevent the contact grid from some weird rendering.
			if (nval.title === "dgrid" && grid === undefined) {
				createDgrid();
			}
		});

		createChart();

		hideLoadingScreen();

		createThemeChoices();

		// It's the server's responsibility to localize the date displayed in the (non-edit) version of an InlineEditBox,
		// but since we don't have a server we'll hack it in the client
		registry.byId("backgroundArea").set('value', locale.format(new Date(), { selector: 'date' }));

		nineAm.setHours(9);
		registry.byId("timePicker").set('value', locale.format(nineAm, { selector: 'time' }));

		function createChart () {
			var chart = new Chart("chart");

			chart.setTheme(MiamiNice)
				.addPlot("default", {
					type: Pie,
					font: "normal normal 11pt Tahoma",
					fontColor: "black",
					labelOffset: -30,
					radius: 80
				}).addSeries("Series A", [
					{y: 4, text: "Pizza",   stroke: "black", tooltip: "Pizza is 50%"},
					{y: 2, text: "Apple", stroke: "black", tooltip: "Apple is 25%"},
					{y: 1, text: "Ice cream",  stroke: "black", tooltip: "I am feeling great!"},
					{y: 1, text: "Other", stroke: "black", tooltip: "Mighty <strong>strong</strong><br>With two lines!"}
				]);

			new MoveSlice(chart, "default");
			new Highlight(chart, "default");
			new Tooltip(chart, "default");

			chart.render();

			new Legend({chart: chart}, "legend");
		}

		function setUrl(theme, rtl, a11y){
			// Function to reload page with specified theme, rtl, and a11y settings
			location.search = "?theme=" + theme + (rtl ? "&dir=rtl" : "") + (a11y ? "&a11y=true" : "");
		}

		function createThemeChoices() {
			// Create menu choices and links to test other themes
			array.forEach(availableThemes, function(theme){
				if(theme != curTheme){
					tmpString +=
						'<a href="?theme=' + theme.theme + '">' + theme.theme + '</' + 'a> (' +
						'<a href="?theme=' + theme.theme + '&dir=rtl">RTL</' + 'a> ' +
						'<a href="?theme=' + theme.theme + '&a11y=true">high-contrast</' + 'a> ' +
						'<a href="?theme=' + theme.theme + '&dir=rtl&a11y=true">RTL+high-contrast</' + 'a> )' +
						' - by: ' + theme.author + ' <br>';
				}

				themeMenu.addChild(new RadioMenuItem({
					id: theme.theme + "_radio",
					label: theme.theme,
					group: "theme",
					checked: theme.theme == curTheme,
					onClick: function(){
						// Change theme, keep current a11y and rtl settings
						setUrl(theme.theme, a11y, rtl);
					}
				}));
			});
			themeData.innerHTML = tmpString;

			themeMenu.addChild(new MenuSeparator({}));
			// add RTL checkbox
			themeMenu.addChild(new CheckedMenuItem({
				label: "RTL",
				checked: rtl,
				onChange: function(val){
					// Keep current theme and a11y setting, but use new dir setting
					setUrl(curTheme, val, a11y);
				}
			}));
			// add high contrast checkbox
			themeMenu.addChild(new CheckedMenuItem({
				label: "high contrast",
				checked: a11y,
				onChange: function(val){
					// Keep current theme and dir setting, but use high-contrast (or not-high-contrast) setting
					setUrl(curTheme, rtl, val);
				}
			}));
		}

		function setBackground(color){
			query('.dijitAccordionChildWrapper .dijitContentPane').style('background', color);
		}

		function showDialog (){
			dialog1.show();
			dialog1.focus();
		}

		function showDialogAb (){
			dialogAB.show();
			dialogAB.focus();
		}

		function setTextBoxPadding (event){
			// summary:
			//		Handler for when a MenuItem is clicked to set non-default padding for
			//		TextBox widgets

			// Effectively ignore clicks on the	 currently checked MenuItem
			var input = registry.byId(event.currentTarget.id);
			if(!input.get("checked")){
				input.set("checked", true);
			}

			// val will be "theme default", "0px", "1px", ..., "5px"
			var val = input.get("label");

			// Set class on body to get requested padding, and remove any previously set class
			if(currentInputPadding){
				domClass.remove(document.body, currentInputPadding);
				currentInputPadding = "";
			}
			if(val != "theme default"){
				currentInputPadding = "inputPadding" + val.replace("px", "");
				domClass.add(document.body, currentInputPadding);
			}

			// Clear previously checked MenuItem (radio-button effect).
			array.forEach(input.getParent().getChildren(), function(mi){
				if(mi != this){
					mi.set("checked", false);
				}
			}, this);
		}

		function hideLoadingScreen () {
			loaderInner.innerHTML += " done.";

			setTimeout(function hideLoader(){
				baseFx.fadeOut({
					node: 'loader',
					duration: 500,
					onEnd: function(n){
						n.style.display = "none";
						// fix bug where it isn't rendering correct;
						main.resize();
					}
				}).play();
			}, 250);
		}

		function createDgrid () {
			grid = new OnDemandGrid({
				collection: collection,
				className: 'dgrid-autoheight',
				columns: {
					id: 'id',
					name: 'name',
					type: 'type'
				}
			}, 'dgrid');

			grid.startup();
		}
	});
});