const {save} = require('./aws')

async function screenshot(page, fileName){
	const fs = require('fs')
	const {promisify} = require('util')
	const unlink = promisify(fs.unlink)

	if(!process.env.UPLOAD_AWS) return

	await page.screenshot({path: fileName})
	await save(fileName, fileName)
	await unlink(fileName)
}

async function image(page, index, link, username, res){
	console.log(username, `Working on image ${index}: ${link.url}`)

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

async function isLoggedIn(page){
	return page.evaluate(() => {
		const _sharedData = window._sharedData
		if(!_sharedData) return false

		const config = _sharedData.config
		return config && config.viewer && config.viewer.id
	})
}

async function login(page, username){

	const already = await isLoggedIn(page)
	if(already){
		console.log(username, 'Already logged in')
		return false
	}

	console.log(username, 'Logging in Instagram')

	return new Promise(async (resolve, reject) => {
		await page.goto(`https://www.instagram.com/accounts/login/?next=%2F${username}%2F&source=desktop_nav`, {waitUntil: 'networkidle2'})

		await page.focus('input[name="username"]')
		await page.keyboard.type(process.env.IG_LOGIN)

		await page.focus('input[name="password"]')
		await page.keyboard.type(process.env.IG_PASS)

		const submit = await page.$('button[type=submit]')
		await submit.click()

		resolve()
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

	//await login(page, params.username)

	/*if(loginPage){
		console.log('Redirection vers le login')
		console.log('Return to the good page we want to')
		await page.goto(data.url, {waitUntil: 'networkidle2'})

		let url = await page.url()
		console.log('Current URL of the page (after login)', url)
	}*/

	console.log(data.username, 'Opening', data.url)

	await page.goto(data.url, {waitUntil: 'networkidle2'})
	await screenshot(page, `${data.username}-home.png`)

	const url = await page.url()
	console.log(data.username, 'Current URL of the page', url, 'Should be', data.url)

	/*const loginPage = url.includes('/accounts/login/')
	console.log('Is the current URL the login page ?', loginPage)*/

	if(data.imagesLimit > 18) {
		const iteration = Math.round(data.imagesLimit / 18)
		console.log(data.username, 'We need to scroll', iteration, 'times');

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
		console.log(data.username, 'Want', data.imagesLimit, 'images')

		let linksTotal = await page.$$eval(`a[href^="/p/"]`, links => links.length)
		console.log(data.username, 'Links Total', linksTotal)

		let links = await page.$$eval(`a[href^="/p/"]`, links => {
			return links.map(link => {
				const img = link.querySelector('img')
				const thb = img ? img.getAttribute('src') : null
				return {url: link.href, thumbnail: thb}
			})
		})

		links = links.slice(0, data.imagesLimit)
		console.log(data.username, `${links.length} links to consider`)

		let index = 0
		for await(let link of links){
			const img = await image(page, index, link, data.username, res)
			data.images.push(img)
			index++
		}
	}

	return data
}

//

function wait (ms) {
	return new Promise(resolve => setTimeout(() => resolve(), ms));
}

function awake(res){
	if(!res) return

	// H12 limitation on Heroku
	// https://spin.atomicobject.com/2018/05/15/extending-heroku-timeout-node/
	if(res) res.write(' ') // empty space

}

//

module.exports = {
	login,
	isLoggedIn,
	extract
}