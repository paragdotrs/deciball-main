import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "@/lib/awsS3";

export const uploadtoS3 = async (file: Buffer, filename: string, contentType: string, fileType: string ) => {
  try {
    console.log(`[S3 Upload] Starting upload for file: ${filename}, type: ${contentType}, fileType: ${fileType}`);
    
    const fileBuffer = file;
    const timestampedFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    console.log(`[S3 Upload] Timestamped filename: ${timestampedFilename}`);
    console.log(`[S3 Upload] Bucket: ${process.env.AWS_S3_BUCKET_NAME}, Region: ${process.env.AWS_S3_REGION}`);
    
    const params = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: `images/${timestampedFilename}`,
      Body: fileBuffer,
      ContentType: contentType, 
    };

    const command = new PutObjectCommand(params);
    console.log(`[S3 Upload] Sending command to S3...`);
    
    const result = await s3Client.send(command);
    console.log(`[S3 Upload] Upload successful:`, result);

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/images/${timestampedFilename}`;
    console.log(`[S3 Upload] Generated URL: ${fileUrl}`);
    
    return fileUrl;
  } catch (error) {
    console.error(`[S3 Upload] Error uploading file ${filename}:`, error);
    throw new Error(`S3 upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};