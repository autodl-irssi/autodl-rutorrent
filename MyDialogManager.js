/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is IRC Auto Downloader.
 *
 * The Initial Developer of the Original Code is
 * David Nilsson.
 * Portions created by the Initial Developer are Copyright (C) 2010
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

function MyDialogManager(pluginPath)
{
	this.isDownloading = false;
	this.pluginPath = pluginPath;

	this.filesDownloader = new AutodlFilesDownloader(this.pluginPath);
	this.trackerInfos = [];
	this.multiSelectDlgBox = new MultiSelect();
	this.configFile = new ConfigFile();
	this.preferences = new Preferences();
	this.trackers = new Trackers();
	this.filters = new Filters(this.multiSelectDlgBox);
	this.servers = new Servers();
	this.trackersId = 0;

	var this_ = this;
	for (var i = 0; i < this.names.length; i++)
	{
		(function(name)
		{
			var id = 'autodl-' + name;
			theDialogManager.setHandler(id, "beforeShow", function()
			{
				this_[name].onBeforeShow(this_.configFile, this_.trackerInfos, this_.trackersId);
			});
			theDialogManager.setHandler(id, "afterHide", function()
			{
				this_[name].onAfterHide();
			});
		})(this.names[i]);
	}

	// Download new tracker files once every hour
	setInterval(function() { this_._downloadAllFiles(); }, 60*60*1000);

	this._downloadAllFiles();
}

MyDialogManager.prototype.names =
[
	'preferences',
	'filters',
	'trackers',
	'servers'
];

MyDialogManager.prototype._isDialogVisible =
function(name)
{
	return $.inArray('autodl-' + name, theDialogManager.visible) >= 0;
}

MyDialogManager.prototype._isOneOfOurDialogsVisible =
function()
{
	for (var i = 0; i < this.names.length; i++)
	{
		if (this._isDialogVisible(this.names[i]))
			return true;
	}
	return false;
}

MyDialogManager.prototype.toggleDialog =
function(name)
{
	if (this._isDialogVisible(name))
	{
		theDialogManager.hide('autodl-' + name);
		return;
	}

	if (this._isOneOfOurDialogsVisible())
	{
		alert(theUILang.autodlCloseOther);
		return;
	}

	this.dialogName = name;
	this._downloadConfigFile();
}

// Downloads the autodl.cfg file and all *.tracker files
MyDialogManager.prototype._downloadAllFiles =
function()
{
	if (this.isDownloading)
		return;
	this.isDownloading = true;
	var this_ = this;
	this.filesDownloader.downloadAllFiles(function(errorMessage)
	{
		this_._onDownloadedFiles(errorMessage, true);
	});
}

// Downloads the autodl.cfg file
MyDialogManager.prototype._downloadConfigFile =
function()
{
	if (this.isDownloading)
		return;
	this.isDownloading = true;
	var this_ = this;
	this.filesDownloader.downloadConfig(function(errorMessage)
	{
		this_._onDownloadedFiles(errorMessage, false);
	});
}

MyDialogManager.prototype._onDownloadedFiles =
function(errorMessage, downloadedAllFiles)
{
	try
	{
		this.isDownloading = false;
		var dialogName = this.dialogName;
		this.dialogName = null;

		if (errorMessage)
		{
			log(theUILang.autodlError + errorMessage);
			return;
		}

		this.configFile.parse(this.filesDownloader.getConfigFile());
		if (downloadedAllFiles)
			this._parseXmlDocuments(this.filesDownloader.getTrackers());

		if (dialogName)
			theDialogManager.show('autodl-' + dialogName);
	}
	catch (ex)
	{
		log("MyDialogManager._onDownloadedFiles: ex: " + ex);
	}
}

MyDialogManager.prototype._parseXmlDocuments =
function(aryDocs)
{
	var trackerInfos = [];

	for (var i = 0; i < aryDocs.length; i++)
	{
		var xmlDoc = aryDocs[i];
		trackerInfos.push(new TrackerInfo(xmlDoc));
	}

	this.trackerInfos = trackerInfos;
	this.trackersId++;
}