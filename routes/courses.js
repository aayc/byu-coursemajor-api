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
	if (req.body.time) {
		// Passed in as [["MTWThFSSu", "12:00pm", "1:00pm"], ["MW", "12:00pm", "1:00pm"]]
		searchResults = searchResults.map(c => { 
			c.sections = c.sections.filter(sec => doesTimeOverlap([sec.days, sec.startTime, sec.endTime], req.body.time))
			return c
		})
	}
	res.send(searchResults)
})

// Add "by prerequisite"

function doesTimeOverlap(range_a, range_b) {
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