import express from 'express'
import cors from 'cors'
import {graphqlHTTP} from 'express-graphql'
import fs from 'fs'
import path, { resolve } from 'path'
import { GraphQLFloat, GraphQLList, GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql'
import expressGraphqlUploads from 'graphql-upload/graphqlUploadExpress.mjs'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'
import { type } from 'os'
import { MongoClient } from 'mongodb'
import {config} from 'dotenv'
config()

const CON_STR = process.env.URI
const app = express()
const PORT = 5000
app.use(expressGraphqlUploads())

app.use(cors())
const agg_result = [
    
    {
        "$match": {
            "$and": [
                {
                    "imdb.rating": {"$gt": 7}
                },
                {
                    "imdb.rating": {"$lt": 8}
                }
            ]
        }
    },
    {
        "$group": {
            "_id": ["$imdb.rating", "$type"],
            "itemCount": {"$sum": 1},
            "rating": {"$first": "$imdb.rating"},
            "type": {"$first": "$type"},
            "titles": {"$push": "$title"}
        }
    },
    {
        "$sort": {
            "type": 1,
            "rating": 1
        }
    }
]

async function sendData(){
    try {
        const client = await MongoClient.connect(CON_STR)
        const cursor = client.db('sample_mflix').collection('movies').aggregate(agg_result)
        const result = await cursor.toArray()
        await client.close()
        return result
    } catch (error) {
        console.log(error.message)
    }finally{

    }


}

const FILE_TYPE = new GraphQLObjectType({
    name: "filetype",
    fields: {
        filename: {type: GraphQLString},
        mimetype: {type: GraphQLString},
        encoding: {type: GraphQLString},
    }
})

const RESULT_TYPE = new GraphQLObjectType({
    name: "resultType",
    fields: {
        itemCount: {type: GraphQLFloat},
        type: {type: GraphQLString},
        rating: {type: GraphQLFloat},
        titles: {type: new GraphQLList(GraphQLString)}
    }
})

const query = new GraphQLObjectType({
    name: 'query',
    fields: {
        hello: {
            type: GraphQLString,
            resolve(parent, args){
                return "hello world"
            }
        },
        sampleResult: {
            type: new GraphQLList(RESULT_TYPE),
            async resolve(){
                return await sendData()
            }
        }
    },
    
})

const mutation = new GraphQLObjectType({
    name: "mutation",
    fields: {
        addUploads: {
            
            type: new GraphQLList(FILE_TYPE),
            args: {
                files: {type: new GraphQLList(GraphQLUpload)}
            },
            async resolve(_, {files}){
                const allFiles = files.map((file)=>{
                    return new Promise(async(resolve, reject)=>{
                        const {createReadStream, filename, mimetype, encoding} = await file
                        // console.log({filename, mimetype, encoding}, "files")
                        const uppath = path.join(path.resolve(), 'uploads', filename)
                        const writeStream = fs.createWriteStream(uppath)
                        createReadStream().pipe(writeStream)
                        resolve({filename, mimetype, encoding})
                    })
                })


                return (await Promise.allSettled(allFiles)).map(ele=>{console.log(ele); return ele.value})
            }
        }
    }
})



const schema = new GraphQLSchema({
    query, mutation
})




app.use('/graphql', graphqlHTTP({
    schema, graphiql: true
}))


function createUploadsDir(){
    const upPath = path.join(path.resolve(), 'uploads')
    if(!fs.existsSync(upPath)){
        fs.mkdirSync(upPath)
    }
}
app.listen(PORT, ()=>{
    console.log(`Server is Running at Port: ${PORT}`)

    createUploadsDir()
})
