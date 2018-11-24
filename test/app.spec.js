const puppeteer = require('puppeteer')
const {extract} = require('../lib')

describe('App', async () => {

	it('Should return one image', async () => {

		const browser = await puppeteer.launch({
			headless: false,
			args: ['--no-sandbox', '--disable-setuid-sandbox']
		})

		const page = await browser.newPage()
		await page.setViewport({width: 1280, height: 1280})

		const res = await extract(page, {
			url: 'https://www.instagram.com/kappuccinoweb/',
			imagesLimit: 1
		})

		await browser.close()

		expect(res.images.length).toBe(1)

	}, 15000)

})