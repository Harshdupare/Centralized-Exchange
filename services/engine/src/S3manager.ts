import {S3Client , PutObjectCommand , GetObjectCommand} from "@aws-sdk/client-s3";
import { promises } from "dns";
import { Readable } from "stream";

const s3 = new S3Client({
    region : "process.env.region",
    endpoint : "process.env.region",
    credentials : {
        accessKeyId : "",
        secretAccessKey : "",
    }
})


export const s3manager = {
    async uploadSnapShot(snapshot : object , key : string){
        const bucket = "process.env.bucket_name";
        const body = JSON.stringify(snapshot);
        const command = new PutObjectCommand({
            Bucket : bucket,
            Key : key,
            Body : body,
            ContentType : "application/json",
        })
        await s3.send(command);
    },

    async downloadSnapShot(key : string): Promise<string> {
        const bucket = "bucket_name";
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