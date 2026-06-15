import {S3Client , PutObjectCommand , GetObjectCommand} from "@aws-sdk/client-s3";
import { Readable } from "stream";
import dotenv from "dotenv";
import path from "path";
const directoryPath = import.meta.dirname;

dotenv.config({
    path : path.resolve(directoryPath , "../../../.env")
}) 

const s3 = new S3Client({
    region : process.env.AWS_REGION,
    credentials : {
        accessKeyId : process.env.AWS_ACCESS_KEY!,
        secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY!,
    }
})


export const s3manager = {
    async uploadSnapshot(snapshot : object , key : string){
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        const body = JSON.stringify(snapshot);
        const command = new PutObjectCommand({
            Bucket : bucket,
            Key : key,
            Body : body,
            ContentType : "application/json",
        })
        await s3.send(command);
    },

    async downloadSnapshot(key : string): Promise<any> {
        const bucket = process.env.AWS_S3_BUCKET_NAME;
        try{
            const command = new GetObjectCommand({
                Bucket : bucket,
                Key : key,
            });
            const data = await s3.send(command);
            const body = await streamToString(data.Body as Readable);
            return JSON.parse(body);
        }catch(error){
            console.log("failed to download Snapshot : ");
            console.log(error);
            return error;
        }
    }
}


const streamToString = (stream : Readable) : Promise<string> => {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
        stream.on("data" , (chunk) => chunks.push(chunk));
        stream.on("error", (error) => reject(error));
        stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    });
}