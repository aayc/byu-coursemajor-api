var Xray = require('x-ray');
const fs = require('fs')
var startAt = 10
var plusLimit = 20
var courses_url = 'https://catalog.byu.edu/courses?page=' + startAt

var useClassCache = false
var useSectionCache = false

if (process.argv.length > 2) {
	let correctUsage = false
	if (process.argv.includes("--use-class-cache") || process.argv.includes("-cc")) { useClassCache = true; correctUsage = true }
	if (process.argv.includes("--use-section-cache") || process.argv.includes("-sc")) { useSectionCache = true; correctUsage = true }
	if (process.argv[2] == "--help" || !correctUsage) { console.log("Usage: node scrape-sections.js [--use-class-cache (or) -cc] [--use-section-cache (or) -sc]"); process.exit() }
}

scrapeClassData(useClassCache, useSectionCache)

async function scrapeClassData (classesFromFile = false, sectionsFromFile = false) {
	if (classesFromFile) console.log("Reading classes from file rather than scraping");
	if (sectionsFromFile) console.log("Reading sections from file rather than scraping");

	let classes = await scrapeClasses(classesFromFile)
	let sections = await scrapeSections(sectionsFromFile)

	console.log("Fusing classes and sections...")
	for (let i = 0; i < classes.length; i++) {
		classes[i].sections = []
	}

	sections.map(section => {
		for (let i = 0; i < classes.length; i++) {
			if (section.code == classes[i].code) {
				classes[i].sections.push(section)
			}
		}
	})

	fs.writeFile("courses-data.json", JSON.stringify(classes, null, 2), (err) => {
		if (err != null) console.log("error writing file " + err)
	})
	console.log("Success");
}

async function scrapeClasses (fromFile = false) {
	if (fromFile) {
		return JSON.parse(fs.readFileSync("classes-thin-data.json"))
	}

	console.log("Beginning scraping courses...")
	console.time("scrape-courses")
	var x = Xray({
		filters: {
			getCode: (v) => v != undefined ? v.split("-")[0].trim() : undefined,
			getClassName: (v) => v != undefined ? v.split("-").slice(1).join("-").trim() : undefined,
			getNumber: (v) => v != undefined ? Number(v.match(/\d+/g)) : undefined
		}
	})

	nPages = await x("https://catalog.byu.edu/courses", "body", ".pager-last a@href | getNumber")

	let classes = []
	for (let pg = 0; pg < nPages; pg++) {
		console.log("Scraping page " + pg + "/" + nPages)
		let pageScrape = await x('https://catalog.byu.edu/courses?page=' + pg, ".view-content", 
			x(".views-row", [{
				code: ".views-row a | getCode",
				name: ".views-row a | getClassName",
				link: ".views-row a@href",
				prerequisites: x(".views-row a@href", {
					"classes": [],
					"description": ".course-data-table tr:nth-child(2) td:nth-child(2)"
				})
			}]
		))
		classes = classes.concat(pageScrape)
	}

	classes = classes.map(r => {
		let description = r.prerequisites.description.toLowerCase()
		r.prerequisites.classes = classes.filter(c =>
			description.includes(c.code.toLowerCase()) && c.code != r.code
		).map(c => c.code)
		return r
	})

	fs.writeFile("classes-thin-data.json", JSON.stringify(classes, null, 2), (err) => {
		if (err != null) console.log("error writing file " + err)
	})

	console.log("Scraping courses successful")
	console.timeEnd("scrape-courses")
	return classes
}

async function scrapeSections (fromFile = false) {
	if (fromFile) {
		return JSON.parse(fs.readFileSync("sections-data.json"))
	}

	console.log("Beginning section scrape...")
	console.time("scrape-sections")
	require('chromedriver')
	const chrome = require('selenium-webdriver/chrome');
	const {Builder, By, Key, until} = require('selenium-webdriver');
	const screen = { width: 640, height: 480 };

	let driver = new Builder()
	    .forBrowser('chrome')
	    .setChromeOptions(new chrome.Options().headless().windowSize(screen))
	    .build();
	driver.manage().setTimeouts({ script: 300000 });
	driver.get('http://saasta.byu.edu/noauth/classSchedule/index.php')

	let sections = await driver.executeAsyncScript(`
	var done = arguments[0];
	function htmless (s) { return s.replace(/(<([^>]+)>)/ig, "") }
	function list_days (s) { return s.match(/(M|W|Th|TBA|T|F|S)/g) }
	function list_out (s) {
		s = s.replace(/<br>(?!.*<br>)/g, "")
		return s.split("<br>").map(s => s.trim())
	}

	function search2() {
		var url_string;
		var data_object;

		// Get all active search fields
		var department = "", instructor = "", description = "", credits = "", creditComparator = "", building = "", dayListFilter = "", beginTime = "", endTime = "", catListFilter = "", sectiontype= "";

		var deptOptions = document.getElementById("departmentInput").options;
		var departments = []
		for (var i = 1; i < deptOptions.length; i++) departments.push(deptOptions[i].value)

		var semOptions = document.getElementById("dropSemester").options;
		var semesters = []
		for (var i = 0; i < semOptions.length; i++) semesters.push(semOptions[i].value)
		
		var sectionList = []
		var ajaxCalls = []

		for (var i = 0; i < semesters.length; i++) {
			for (var j = 0; j < departments.length; j++) {
				creditType = $('#dropTerm').val();
				url_string = 'ajax/searchXML.php';
				data_object = {'SEMESTER' : semesters[i],
							'CREDIT_TYPE' : creditType,
							'DEPT' : departments[j],
							'INST' : instructor,
							'DESCRIPTION' : description,
							'DAYFILTER' : dayListFilter,
							'BEGINTIME' : beginTime,
							'ENDTIME' : endTime,
							'SECTION_TYPE' : sectiontype,
							'CREDITS' : credits,
							'CREDITCOMP' : creditComparator,
							'CATFILTER' : catListFilter,
							'BLDG' : building};
				
				// Now, to make a ton of requests, concat everything together and save it to a file. Boom, all classes.

				ajaxCalls.push((function (s, d) { 
					return $.ajax({
						type: "POST",
						url: url_string,
						data: data_object,
						success: function (data) {
							if (data.substring(0, 5) == "Error") return

							response = data.split("#")
							results = []
							i = 0
							while (i + 18 < response.length) {
								results.push(response.slice(i, i + 18))
								i += 19
							}

							classes = results.map(row => {
								return {
									"semester": s,
									"department": d, 
									"code": htmless(row[2] + " " + row[4]),
									"section": htmless(row[6]),
									"course-name": htmless(row[9]),
									"professor": htmless(row[10]),
									"credits": htmless(row[11]),
									"days": list_out(row[12]).map(list_days), //todo parse
									"start-time": list_out(row[13]),
									"end-time": list_out(row[14]),
									"location": list_out(row[15]),
									"seats": htmless(row[17])
								}
							})
							classes.sort((a, b) => a["title"] < b["title"] ? -1 : a["title"] > b["title"])
							console.log("pushing")
							sectionList.push(...classes)
						}	
					})
				})(semesters[i], departments[j]))
			}
		}

		$.when(...ajaxCalls).then(() => {
			console.log("done!")
			done(sectionList)
		})
	}
	search2()`)

	
	driver.quit();
	fs.writeFile("sections-data.json", JSON.stringify(sections, null, 2), (err) => {
		if (err != null) console.log("error writing file " + err)
	})
	console.log("Sections scrape success.  Writing to file...")
	console.timeEnd("scrape-sections")
	return sections
}

function range (a, b) {
	res = []
	for (let i = a; i < b; i++) res.push(i)
	return res
}

function flatten (arr) {
    return arr.reduce((flat, f) => flat.concat(Array.isArray(f) ? flatten(f) : f), []);
}

