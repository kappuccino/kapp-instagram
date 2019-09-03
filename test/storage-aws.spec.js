require('dotenv').config()

const {save, listFiles, remove, removeFolder} = require('../aws')

describe('AWS S3', () => {

	it('Should save a file', async () => {
		const local = __dirname+'/test-file.txt'
		const remote = '--test--/test-file.txt'
		const res = await save(local, remote)

		expect(res).toBe(remote)
	}, 1000)

	it('Should read a list of files', async () => {
		const files = await listFiles('--test--')

		expect(files.length).toBeGreaterThan(0)
	}, 1000)

	it('Should remove a file', async () => {
		const remote = '--test--/test-file.txt'

		const res = await remove(remote)

		expect(res).toBeTruthy()
	}, 1000)

	it('Should remove a folder and 2 files', async () => {
		const local = __dirname+'/test-file.txt'

		await save(local, '--test--/test-upload-s3-a.txt')
		await save(local, '--test--/test-upload-s3-b.txt')

		const res = await removeFolder('--test--')

		expect(res).toBeTruthy()
	}, 1000)

})
