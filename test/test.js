const assert = require('assert');
const chai = require('chai')
const expect = require('chai').expect

chai.use(require('chai-http'))

const app = require('../bin/www')


describe('Basic GET requests', () => {

  describe('codes', () =>
    it('should return a long list of class codes', () =>
    	chai.request(app)
    		.get('/courses/codes')
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf.above(30)
    		})
    )
  )

  describe('names', () =>
    it('should return a long list of class names', () =>
    	chai.request(app)
    		.get('/courses/names')
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf.above(30)
    		})
    )
  )
})

describe('Search functionality', () => {

  describe('all results', () =>
    it('should return lots of classes', () =>
      chai.request(app)
                .post('/courses/search')
                .set('content-type', 'application/json')
      .send({})
              .then((res) => {
                      expect(res).to.have.status(200);
                      expect(res).to.be.json;
                      expect(res.body).to.be.an('array');
                      expect(res.body).to.have.lengthOf.above(300)
              })
    )
  )

  describe('by code', () =>
    it('should return one class: ACC 200', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({code: 'ACC 200'})
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf(1)
    		})
    )
  )

  describe('by codes', () =>
    it('should return two classes: ACC 200, C S 142', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({codes: ['ACC 200', "C S 142"] })
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf(2)
    		})
    )
  )

  describe('by name', () =>
    it('should return one class: AHTG 100', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({name: 'A HTG 100 - American Heritage'})
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf(1)
    		})
    )
  )

  describe('by code (honors class)', () =>
    it('should return two classes - ENGL 316 and ENGL 316 Honors', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({code: 'ENGL 316'})
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf(2)
    		})
    )
  )

  describe('by conflicting code and name', () =>
    it('should return two classes - ENGL 316 and ENGL 316 Honors', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({code: 'ENGL 316', name: "A HTG 100 - American Heritage"})
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body).to.have.lengthOf(0)
    		})
    )
  )

  describe('by availability true', () =>
    it('should return classes with available sections only', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({available: true})
    		.then((res) => {
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body.filter(c => 
    				c.sections.every(s => Number(s.seats.split("/")[0]) < Number(s.seats.split("/")[1]))))
    			.to.have.lengthOf(res.body.length)
    	})
    )
  )

  describe('by availability false', () =>
    it('should return classes with full sections only', () =>
    	chai.request(app)
    		.post('/courses/search')
    		.set('content-type', 'application/json')
        .send({available: false})
    		.then((res) => {
    			//console.log(res.body.map(c => c.sections.map(s => s.seats)))
    			expect(res).to.have.status(200);
    			expect(res).to.be.json;
    			expect(res.body).to.be.an('array')
    			expect(res.body.filter(c => 
    				c.sections.every(s => Number(s.seats.split("/")[0]) == Number(s.seats.split("/")[1]))))
    			.to.have.lengthOf(res.body.length)
    	})
    )
  )
})
