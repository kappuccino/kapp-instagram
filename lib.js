const {save} = require('./aws')

async function screenshot(page, fileName){
	const fs = require('fs')
	const {promisify} = require('util')
	const unlink = promisify(fs.unlink)

	if(!process.env.UPLOAD_AWS){
		console.log(`Uplaoad screenshot ${fileName} to AWS disabled`)
		return
	}

	await page.screenshot({path: fileName})
	await save(fileName, fileName)
	await unlink(fileName)
}

async function image(page, index, link, username, res){
	console.log(`Working on image ${index}: ${link.url}`)

	awake(res)

	const image = {
		thumbnail: link.thumbnail,
		url: link.url,
		src: '',
		caption: ''
	}

	await page.goto(image.url, {waitUntil: 'networkidle2'})
	await screenshot(page, `${username}-${index}.png`)

	try {
		image.src = await page.$eval(`img[decoding="auto"]`, item => item.src)
	} catch (e) {}

	try {
		image.caption = await page.$eval(`.C4VMK span:first-of-type`, item => item.innerText)
	} catch (e) {}

	return image
}

function wait (ms) {
	return new Promise(resolve => setTimeout(() => resolve(), ms));
}

async function isLoggedIn(page){
	return page.evaluate(() => {
		const _sharedData = window._sharedData
		if(!_sharedData) return false

		const config = _sharedData.config
		return config && config.viewer && config.viewer.id
	})
}

async function isLoginPage(page){

	return page.evaluate(() => {
		return !!document.querySelector('input[name="username"]')
	})

}


async function login(page){

	const already = await isLoggedIn(page)
	if(already){
		console.log('Already logged in')
		return false
	}

	console.log('Logging in Instagram')

	return new Promise(async (resolve, reject) => {
		await page.goto('https://www.instagram.com/accounts/login/', {waitUntil: 'networkidle2'})

		const timeout = setTimeout(() => {
			const err = new Error('Login failed timeout')
			reject(err)
		}, 5000)

		page.on('response', response => {
			if(response._url !== 'https://www.instagram.com/accounts/login/ajax/') return

			response.text().then(async textBody => {
				const res = JSON.parse(textBody)

				clearTimeout(timeout)
				await wait(500)

				return res.authenticated ? resolve(true) : resolve(false)
			})
		})

		await page.focus('input[name="username"]')
		await page.keyboard.type(process.env.IG_LOGIN)

		await page.focus('input[name="password"]')
		await page.keyboard.type(process.env.IG_PASS)

		const submit = await page.$('button[type=submit]')
		await submit.click()
	})

}

async function extract(page, params, res){

	const d = new Date()

	const data = {
		date: d.toString(),
		time: d.getTime(),
		username: params.username,
		url: `https://www.instagram.com/${params.username}/`,
		followers: params.followers || false,
		imagesLimit: params.imagesLimit || 0,
		images: []
	}

	console.log('Opening', data.url)

	/*// Log in first
	await login(page)
	console.log('Next')*/

	await page.goto(data.url, {waitUntil: 'networkidle2'})
	await screenshot(page, `${data.username}-home.png`)

	console.log( page.url())
	const url = await page.url()
	console.log({url})
	const loginPage = url.includes('/accounts/login/')

	console.log('Login page ?', {loginPage})
	if(loginPage){
		await page.goto(data.url, {waitUntil: 'networkidle2'})
		await screenshot(page, `${data.username}-home2.png`)
	}

	if(data.imagesLimit > 18) {
		const iteration = Math.round(data.imagesLimit / 18)
		console.log('We need to scroll', iteration, 'times');

		for (let i = 0; i < iteration; i++) {
			awake(res)
			await page.evaluate(async () => {
				window.scrollBy(0, 3500)
			})
			await wait(500)
		}
	}

	if(data.followers) {
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

	if(data.imagesLimit > 0){
		console.log('Want', data.imagesLimit, 'images')

		let linksTotal = await page.$$eval(`a[href^="/p/"]`, links => links.length)
		console.log('Links Total', linksTotal)

		let links = await page.$$eval(`a[href^="/p/"]`, links => {
			return links.map(link => {
				const img = link.querySelector('img')
				const thb = img ? img.getAttribute('src') : null
				return {url: link.href, thumbnail: thb}
			})
		})

		links = links.slice(0, data.imagesLimit)
		console.log(`${links.length} links to consider`)

		let index = 0
		for await(let link of links){
			const img = await image(page, index, link, data.username, res)
			data.images.push(img)
			index++
		}
	}

	return data
}

function awake(res){
	if(!res) return

	// H12 limitation on Heroku
	// https://spin.atomicobject.com/2018/05/15/extending-heroku-timeout-node/
	if(res) res.write(' ') // empty space

}

module.exports = {
	login,
	isLoggedIn,
	extract
}