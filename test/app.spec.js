require('dotenv').config()

const puppeteer = require('puppeteer')
const {extract, login, isLoggedIn} = require('../lib')

describe('App', () => {

	it('Should login', async () => {

		const browser = await puppeteer.launch({
			headless: false,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		})

		const page = await browser.newPage()
		await page.setViewport({width: 1280, height: 1280})

		await login(page)
		const is = await isLoggedIn(page)
		await browser.close()

		expect(is).toBeTruthy()

	}, 15000)

	it('Should return one image', async () => {

		const browser = await puppeteer.launch({
			headless: false,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		})

		const page = await browser.newPage()
		await page.setViewport({width: 1280, height: 1280})

		const res = await extract(page, {
			username: 'teenfr',
			imagesLimit: 1
		})

		await browser.close()

		expect(res.images.length).toBe(1)

	}, 15000)

})

// Buildpack
// https://buildpack-registry.s3.amazonaws.com/buildpacks/jontewks/puppeteer.tgz