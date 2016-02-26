console._log = console.log
console._times = {}
console._interval = null
console.time = (s) ->
	if not console._times[s]
		console._times[s] =
			time: 0
			count: 0
			start: 0
			avg: 0

	console._times[s].start = performance.now()

console.timeEnd = (s) ->
	if console._times[s]?
		diff = performance.now() - console._times[s].start
		console._times[s].count++
		console._times[s].time += diff
		console._times[s].avg = (console._times[s].time / console._times[s].count).toFixed(3)
		# console._log('%c' + s + ': ' + diff.toFixed(3) + 'ms (Avg: ' + console._times[s].avg + 'ms)', 'color: gray;');

	clearTimeout(console._interval)
	console._interval = setTimeout console.showTimeAverages, 1000
	# console.showTimeAverages()

console.showTimeAverages = ->
	byTime = []
	for s of console._times
		byTime.push { s:s, avg:console._times[s].avg }

	byTime.sort (a, b) ->
		if a.avg < b.avg then return 1;
		if a.avg > b.avg then return -1;
		return 0;

	for o in byTime
		console._log('%c' + o.avg + ': ' + o.s, 'color: blue;')
		return #@Todo - hack to only show worst thing


console._error = console.error
console.error = (msg) ->
	if msg.substr(0, 7) is 'Warning'
		if msg.indexOf('Warning: bind()') > -1 or msg.indexOf('contentEditable') > -1 then return false
		console.warn msg #@TODO - SUPRESS WARNINGS
		# false
	else
		console._error msg