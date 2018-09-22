# BYU Course/Major API

Interested in running analytics or making web services to help people schedule classes/find their dream major/find out what minors they can get?  Let this API do the heavy lifting for you.

## Accessible & Free to Use
Anyone can query the server (temporarily at `https://whispering-taiga-29713.herokuapp.com`) for course or major information.  [Try me](https://whispering-taiga-29713.herokuapp.com/courses/codes)

## Up-to-date
Course/major data is updated nightly from BYU's database.

# API

All parameters are optional.

### `GET` Requests
URL | Parameters | Result Format
--- | --- | ---
`/courses/codes` | none | `[list of all course codes, e.g. "ACC 200", "C S 142"]`
`/courses/names` | none | `[list of all course names, e.g. "ALBAN 101 - First-Year Language Study: Albanian", ...]`

### `POST /search`

You can use multiple parameters to refine your search (e.g.. searching for available, Fall 2019 courses)

Parameter | Description | Result Format
--- | --- | ---
`{ code: "ACC 200"}` | Search by course code | `[Course Object]`
`{ name: "ACC 200 - Principles of Accounting"}` | Search by course name | `[Course Object]`
`{ codes: ["ACC 200", "A HTG 100"]}` | Search by course codes | `[Course Object, Course Object]`
`{ names: ["ACC 200 - ...", "A HTG 100 - ..."]}` | Search by course names | `[Course Object, Course Object]`
`{ available: true/false }` | Search all open sections | `[Course Objects with only available sections listed]`

# Result Object Formats

## Course Object
```
{
    "code": "ACC 200",
    "name": "Principles of Accounting",
    "link": "https://catalog.byu.edu/business/school-of-accountancy/principles-of-accounting",
    "prerequisites": {
      "description": "None",
      "classes": []
    },
    "sections": [
      {
        "code": "ACC 200",
        "course-name": "Principles of Accounting",
        "credits": "3",
        "days": [
          [
            "F"
          ]
        ],
        "department": "ACC",
        "location": [
          "140 JSB"
        ],
        "professor": "Larson, Melissa",
        "seats": "269 / 859",
        "section": "001",
        "semester": "20185",
        "start-time": [
          "10:00am"
        ],
        "end-time": [
          "11:15am"
        ]
      }
     ]
}
```

Property | Description
--- | ---
`code` | Course code
`name` | Course code + " - " + description
`link` | URL to class website
`prerequisites` | Qualitative prerequisites and list of class prerequisites.
`sections` | List of sections for the class.
`sections - days, times` | The ith array in days corresponds to the ith entries in start and end times.

# Tests

To run unit tests: `npm test`

# Coming Soon

* Queryable Major/Minor Programs
* Searching by time, term and semester.