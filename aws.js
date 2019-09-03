const {promisify} = require('util')

const bucket = process.env.AWS_S3_BUCKET
let awsClient

function getAwsClient(){

	//if(awsClient) return awsClient

	const AWS = require('aws-sdk')

	// mandatory ??
	AWS.config.setPromisesDependency(null)

	AWS.config.update({
		accessKeyId: process.env.AWS_KEY,
		secretAccessKey: process.env.AWS_SECRET,
		region: process.env.AWS_REGION
	})

	return new AWS.S3()

	/*awsClient = new AWS.S3()
	return awsClient*/
}

function sanytise_key(key){

	// We don't need a / on front of the key
	if(key.substring(0, 1) === '/') return key.substr(1)

	return key
}

//--

async function save(local, key){

	const fs = require('fs')
	const mime = require('mime')

	const aws = getAwsClient()
	const readFile = promisify(fs.readFile)

	let data

	try {
		data = await readFile(local)
	} catch (e) {
		throw e
	}

	const params = {
		ACL:'public-read',
		Bucket: bucket,
		Key: sanytise_key(key),
		Body: data,
		ContentType: mime.getType(key, 'application/octet-stream')
	}

	try {
		await aws.putObject(params).promise()
	} catch(e){
		console.log(e)
		throw e
	}

	return key
}

async function listFiles(prefix){

	const aws = getAwsClient()

	let data

	const params = {
		Bucket: process.env.AWS_S3_BUCKET,
		Prefix: sanytise_key(prefix)
	}

	try{
		data = await aws.listObjects(params).promise()
	} catch (e) {
		throw e
	}

	if(!data || !data.Contents || !data.Contents.length) return []

	return data.Contents
			.map(Content => ({Key: Content.Key}))
			.sort((a,b) => a.Key < b.Key)

}

async function remove(path){

	const aws = getAwsClient()

	const params = {
		Bucket: process.env.AWS_S3_BUCKET,
		Key: sanytise_key(path)
	}

	try {
		await aws.deleteObject(params).promise()
	} catch (e) {
		throw e
	}

	return true
}

async function removeFolder(path){

	const aws = getAwsClient()

	const prefix = sanytise_key(path)
	const files = await listFiles(prefix)

	const params = {
		Bucket: process.env.AWS_S3_BUCKET,
		Delete: {
			Objects: files,
			Quiet: false
		}
	}

	try {
		await aws.deleteObjects(params).promise()
	} catch (e) {
		throw e
	}

	return true
}


module.exports = {
	save,
	listFiles,
	remove,
	removeFolder
}