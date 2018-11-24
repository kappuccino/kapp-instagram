// Based on https://timleland.com/headless-chrome-on-heroku/

const puppeteer = require('puppeteer')
const express = require('express')
const {extract} = require('./lib')

const app = express()
const port = process.env.PORT || 8080

// --

app.get('/', async (req, res) => {

	res.setHeader('Content-Type', 'application/json')

	const username = req.query.username
	const followers = !!req.query.followers
	const imagesLimit = parseInt(req.query.images, 10)

	const url = `https://www.instagram.com/${username}/`
	console.log(`Opening ${url}`, 'Params', req.query)

	const browser = await puppeteer.launch({
		headless: false,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	})

	const page = await browser.newPage()
	await page.setViewport({width: 1280, height: 1280})

	const data = await extract(page, {username, url, followers, imagesLimit}, res)

	// Pas possible d'utiliser res.json() —à cause du reswrite(' ')
	res.write(JSON.stringify(data))
	res.end()

	console.log('Done')

	await browser.close()
})

app.listen(port, function() {
	console.log('App listening on port ' + port)
})