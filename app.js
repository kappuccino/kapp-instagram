// Based on https://timleland.com/headless-chrome-on-heroku/

const express = require('express')
const app = express()
const puppeteer = require('puppeteer')
const port = process.env.PORT || 8080

async function image(page, url){
	console.log(`Working on image: ${url}`)

	const image = {
		url
	}

	await page.goto(url, {waitUntil: 'networkidle2'})

	try {
		image.src = await page.$eval(`img[decoding="auto"]`, item => item.src)
	} catch (e) {}

	try {
		image.caption = await page.$eval(`.C4VMK span:first-of-type`, item => item.innerText)
	} catch (e) {}

	return image
}


app.get('/', function(req, res) {

	const username = req.query.username
	const followers = !!req.query.followers

	const imagesLimit = parseInt(req.query.images, 10)

	const url = `https://www.instagram.com/${username}/`
	console.log(`Opening ${url}`, 'Params', req.query)

	;(async() => {
		const browser = await puppeteer.launch({
			headless: true,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		})

		const page = await browser.newPage()
		await page.setViewport({width: 1280, height: 1280})

		await page.goto(url, {waitUntil: 'networkidle2'})

		const data = {
			username,
			url,
			followers: '',
			images: []
		}

		if(followers) {
			data.followers = await page.evaluate(() => {
				const _sharedData = window._sharedData
				if(!_sharedData) return 0

				const entry_data = _sharedData.entry_data
				if(!entry_data) return 0

				const ProfilePage = entry_data.ProfilePage
				if(!ProfilePage || !ProfilePage.length) return 0

				const graphql = ProfilePage[0].graphql
				if(!graphql) return 0

				const user = graphql.user
				if(!user) return 0

				return user.edge_followed_by.count
			})
		}

		if(imagesLimit > 0){
			let links = await page.$$eval(`a[href^="/p/"]`, links => links.map(link => link.href))
			links = links.slice(0, imagesLimit)

			console.log(`${links.length} links to consider`)

			for await(let link of links){
				const img = await image(page, link)
				data.images.push(img)
			}
		}

		res.json(data)

		await browser.close()
	})()

})

app.listen(port, function() {
	console.log('App listening on port ' + port)
})