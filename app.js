require('dotenv').config()

// Based on https://timleland.com/headless-chrome-on-heroku/

const puppeteer = require('puppeteer')
const express = require('express')
const {extract} = require('./lib')

const app = express()
const port = process.env.PORT

// --

let browser

async function init(){
	console.log('Opening Chrome')

	const rand = Math.round(Math.random() * 50)

	browser = await puppeteer.launch({
		headless: process.env.NODE_ENV === 'production',
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		defaultViewport: {
			width: 1280 + rand,
			height: 800 + rand
		}
	})

	const page = await browser.newPage()
	await page.goto('https://instagram.com', {waitUntil: 'networkidle2'})
}

// --

app.get('/', async (req, res) => {

	res.setHeader('Content-Type', 'application/json')

	const username = req.query.username
	const followers = !!req.query.followers
	const imagesLimit = parseInt(req.query.images, 10)

	console.log(username, 'Opening with params', req.query)

	const page = await browser.newPage()
	const data = await extract(page, {username, followers, imagesLimit}, res)

	// Pas possible d'utiliser res.json() à cause du reswrite(' ')
	res.write(JSON.stringify(data))
	res.end()

	console.log('Done')

	await page.close()
	//await browser.close()
})

app.listen(port, async () => {
	await init()

	console.log('App listening on port ' + port)
})