# window.React = require 'react'
# window.Perf = require 'react-addons-perf'

"use strict";

loadModule = require './loadModule'

Viewer = require 'viewer'
ViewerApp = Viewer.components.ViewerApp

moduleId = decodeURIComponent(document.location.hash).substr(1)

# ReactDOM.render `<ViewerApp />`, document.getElementById('viewer-app')

loadModule moduleId, (items) ->
	ReactDOM.render `<ViewerApp
						module={items.module}
						chunks={items.chunks}
						insertItems={items.insertItems}
					/>`, document.getElementById('viewer-app')