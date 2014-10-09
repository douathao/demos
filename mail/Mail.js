define([
	'dojo/on',
	'dojo/_base/lang',
	'dijit/_TemplatedMixin',
	'dijit/_WidgetBase',
	'dijit/_WidgetsInTemplateMixin',
	'dojo/_base/declare',
	'dojo/text!./template/mail.html',
	'dojo/topic',
	// Widgets in template
	'dijit/layout/BorderContainer',
	'dijit/layout/ContentPane',
	'dijit/form/ComboBox',
	'dijit/Editor',
	'dijit/_editor/plugins/LinkDialog',
	'dijit/_editor/plugins/FontChoice',
	'dijit/form/Button'
], function (
	on,
	lang,
	_TemplatedMixin,
	_WidgetBase,
	_WidgetsInTemplateMixin,
	declare,
	template,
	topic
) {
	return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
		widgetsInTemplate: true,
		templateString: template,
		lagacyStore: null,
		closable: true,
		postCreate: function () {
			this.to.set('store', this.lagacyStore);

			this.own(
				on(this.okButton, 'click', lang.hitch(this, function () {
					if (this.to.get('value') === '') {
						alert('Please enter a recipient address');
					} else {
						topic.publish('mail/showSendBar');
					}
				})),
				on(this.cancelButton, 'click', lang.hitch(this, function () {
					topic.publish('mail/closeMail');
				}))
			);
		},
		// for "new message" tab closing
		onClose: function () {
			return confirm('Are you sure you want to leave your changes?');
		}
	});
});
