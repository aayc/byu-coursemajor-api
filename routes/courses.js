var express = require('express');
var router = express.Router();
var fs = require('fs')

courses = JSON.parse(fs.readFileSync("data/courses-data.json"))

/*
classes = [{ code, name, link, prerequisites, sections []}]
*/

// Returns a list of all class codes
router.get('/codes', (req, res, next) => res.send(flatten(courses.map(c => c.code))) )

// Returns a list of all class names
router.get('/names', (req, res, next) => res.send(courses.map(c => c.code + " - " + c.name)))

/* Returns a list of classes with sections that meet requirements:
	Code
	Name
	Time intervals (will return sections that fit in provided time literals)
	Department
*/
router.post('/search', function (req, res, next) {
	searchResults = courses
	if (req.body.code) searchResults = searchResults.filter(c => c.code == req.body.code)
	if (req.body.name) searchResults = searchResults.filter(c => c.code + " - " + c.name == req.body.name)
	if (req.body.codes) searchResults = searchResults.filter(c => req.body.codes.some(co => c.code == co))
	if (req.body.names) searchResults = searchResults.filter(c => req.body.names.some(na => c.name == na))
	if (req.body.hasOwnProperty("available")) {
		searchResults = searchResults.map(c => { 
			c.sections = c.sections.filter(sec => isAvailable(sec.seats) == req.body.available); 
			return c
		})
	}
	// TODO
	/*if (req.body.times) {
		// Passed in as { days: [[]], start-time: ["1:00pm"], end-time: ["2:00pm"] }
		searchResults = searchResults.map(c => { 
			c.sections = c.sections.filter(sec => doesTimeOverlap(sec, req.body.times))
			return c
		})
	}*/
	res.send(searchResults)
})

// Add "by prerequisite"

// TODO unfinished
function doesTimeOverlap(section, times) {
	getMinuteCount = (day, time_s) => { 
		dayIx = ["M", "T", "W", "Th", "F", "S", "Su"].indexOf(day)
		hasPM = time_s.indexOf("pm") != -1
		hours = Number(time_s.match(/^(\d+)/)[1])
		hours += hasPM && hours < 12 ? 12 : 0
		hours -= !hasPM && hours == 12 ? 12 : 0
		minutes = Number(time_s.match(/:(\d+)/)[1]);
		return dayIx * 1440 + hours * 60 + minutes
	}

	getClassTimeRange = (c) => {
		blocks = c["days"]
		start = c["start-time"]
		end = c["end-time"]

		if (start[0] == "TBA" || end[0] == "TBA") return null
		if (blocks.length != start.length) console.log("ERROR: faulty assumptions (scheduler.js 18)")

		ranges = blocks.map((days, k) => 
			days.map(day => [getMinuteCount(day, start[k]), getMinuteCount(day, end[k])]))
		return ranges
	}

	/*convertToClassFormat = (t) => {
		t.map(r_ls => {
			// r_ls : [["MWFS", "3:00pm", "5:00pm"]] => [[minute, minute for monday], [minute, minute for Wedneday], [minute, minute for ]]
			

			let days = r_ls[0].match(/(M|Th|W|T|F|S|Su)/g)
			let times = [r_ls[1]]
			
		})
	}*/

	

	// Check if days overlap, then check if times overlap
}

function isAvailable (availabilityString) {
	let parts = availabilityString.split("/")
	return Number(parts[0].trim()) < Number(parts[1].trim())
}

function unique (ls) {
	return [...new Set(ls)]
}

function flatten (arr) {
    return arr.reduce((flat, f) => flat.concat(Array.isArray(f) ? flatten(f) : f), []);
}

module.exports = router;