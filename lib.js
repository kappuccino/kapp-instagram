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
	await page.screenshot({path: `screenshot/${username}-${index}.png`})

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

async function extract(page, params, res){

	const d = new Date()

	const data = {
		date: d.toString(),
		time: d.getTime(),
		username: params.username,
		url: params.url,
		followers: params.followers,
		imagesLimit: params.imagesLimit,
		images: []
	}

	await page.goto(data.url, {waitUntil: 'networkidle2'})
	await page.screenshot({path: `screenshot/${data.username}.png`})

//await wait(1000)

	/*console.log('--source--')
	const bodyHTML = await page.evaluate(() => document.body.innerHTML);
	console.log()
	console.log('--source--')
*/

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
	extract
}