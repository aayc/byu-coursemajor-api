var Xray = require('x-ray');

var catalog_url = 'https://catalog.byu.edu'
var fs = require('fs');
var x = Xray({
	filters: {
		getDepth: (v) => {
			return v != undefined && v.includes("depth") ? parseInt(v.match(/\d/g)[0]) : -1
		},
		getFirstToken: (v) => {
			return v != undefined ? v.split(" ")[0] : undefined;
		},
		getSecondToken: (v) => {
			return v != undefined ? v.split(" ")[1] : undefined;
		},
		getNumber: (v) => {
			return v != undefined ? Number(v.match(/\d+[.]?(\d+)?/g)) : undefined;
		}
	}
});

var useMajorCache = false

if (process.argv.length > 2) {
	let correctUsage = false
	if (process.argv.includes("--use-major-cache") || process.argv.includes("-mc")) { useMajorCache = true; correctUsage = true }
	if (process.argv[2] == "--help" || !correctUsage) { console.log("Usage: node scrape-sections.js [--use-major-cache (or) -mc]"); process.exit() }
}

scrapeMajors(useMajorCache)

async function scrapeMajors (fromFile = false, acc = [], startIx = 1) {
	if (fromFile) {
		console.log("Reading from cache")
		acc = JSON.parse(fs.readFileSync("programs-data-intermed.json"))
	}
	else {
		console.log("Beginning scrape")
		let links = await x(catalog_url, ["#program-drop-down option@value"])
		for (let i = startIx; i < links.length; i++) {
			console.log(i + ": " + links[i])
			try {
				res = await x(catalog_url + links[i], "body", {
				//x("https://catalog.byu.edu/international-and-area-studies/asian-studies-program/asian-studies-minor", "body", { // has 4 level deep structure
				//x("https://catalog.byu.edu/life-sciences/plant-and-wildlife-sciences/wildlife-wildlands-conservation-bs", "body", { // has 2 recommended sections
				//x("https://catalog.byu.edu/life-sciences/plant-and-wildlife-sciences/genetics-genomics-biotechnology-bs", "body", { //high structure, nested recommmended
					"title": ".program-title-title",
					"degree": ".program-degree-degree",
					"reqs": x(".program-requirements-group", [{
						"level": ".pr-instructions-level-number | getFirstToken",
						"level-number": ".pr-instructions-level-number | getSecondToken",
						"instruction": ["> > span:nth-child(2)"],
						"instruction-number": ["> > span:nth-child(2) | getNumber"],
						"text": ["> .pr-text-text"],
						"links": ["> > .pr-link"],
						"description": ["> .pr-subgrp-title"],
						"other-description": ["> .pr-other-description"],
						"depth": "div:first-child@class | getDepth"
					}])
				})
				acc.push(res)
			} catch (err) {
				console.log("Had error, trying again")
				scrapeMajors(false, acc, i)
			}
		}
		fs.writeFile("programs-data-intermed.json", JSON.stringify(acc, null, 2), (err) => {
			if (err) console.log("error writing intermediate: " + err)
		})
	}
	programs = acc.filter(p => p["title"] != "Open-Major").map(parseProgram)
	fs.writeFile("programs-data.json", JSON.stringify(programs, null, 2), (err) => {
		if (err) console.log("error: " + err)
	})
	console.logs("Success");
}
 

function parseProgram (programParts) {
	isNotEmptyBlock = negateFn(isEmptyBlock)
	isNotTextBlock = negateFn(isTextBlock)

	blocks = programParts["reqs"].filter(isNotEmptyBlock)
	for (i = blocks.length - 1; i >= 1; i--) {
		if (!blocks[i].hasOwnProperty("level"))
			blocks[i - 1]["text"].push(...blocks[i]["text"])
	}
	allReqsFlat = blocks.filter(isNotTextBlock)
	
	requirements = [deepcopy(allReqsFlat[0])]
	for (i = 1; i < allReqsFlat.length; i++) {
		let next = allReqsFlat[i]
		if (next.depth < requirements[requirements.length - 1].depth) {
			condenseReqStack(requirements, next.depth)
		}
		requirements.push(deepcopy(next))
	}
	condenseReqStack(requirements, 1)
	return {
		"title": programParts.title,
		"degree": programParts.degree,
		"requirements": requirements
	}
}

function condenseReqStack (reqs, depthThreshold) {
	let children = []
	while (reqs[reqs.length - 1].depth > depthThreshold) {
		popped = reqs.pop()
		children.unshift(deepcopy(popped))
		if (reqs[reqs.length - 1].depth < popped.depth) {
			reqs[reqs.length - 1]["children"] = deepcopy(children)
			children = []
		}
	}
}

function deepcopy (o) { return JSON.parse(JSON.stringify(o)) }

function isEmptyBlock(block) {
	return Object.keys(block).map(k => block[k].length == 0)
							 .filter(identity)
							 .length == Object.keys(block).length
}

function isTextBlock (block) { return !block.hasOwnProperty("level") }
function notEq (v) { return (a) => a != v }
function negateFn (fn) { return (...a) => !fn(...a) }
function identity (_) { return _ }
