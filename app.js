// Based on https://timleland.com/headless-chrome-on-heroku/

const puppeteer = require('puppeteer')
const express = require('express')
const {extract} = require('./lib')

const app = express()
const port = process.env.PORT || 8080

// --
//app.use(express.static(''))

app.get('/', async (req, res) => {

	res.setHeader('Content-Type', 'application/json')

	const username = req.query.username
	const followers = !!req.query.followers
	const imagesLimit = parseInt(req.query.images, 10)

	console.log(`Opening`, 'Params', req.query)

	const browser = await puppeteer.launch({
		headless: process.env.NODE_ENV === 'production',
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	})

	const page = await browser.newPage()
	await page.setViewport({width: 1280, height: 1280})

	const data = await extract(page, {username, followers, imagesLimit}, res)

	// Pas possible d'utiliser res.json() —à cause du reswrite(' ')
	res.write(JSON.stringify(data))
	res.end()

	console.log('Done')

	await browser.close()
})

app.listen(port, function() {
	console.log('App listening on port ' + port)
})