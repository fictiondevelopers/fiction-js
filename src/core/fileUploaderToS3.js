import AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

/**
 * Uploads file(s) to S3 and returns the URL(s)
 * @param {File|File[]} files - Single file or array of files to upload
 * @param {string} folder - Optional folder path in S3 bucket
 * @returns {Promise<string|string[]>} URL or array of URLs of uploaded files
 */
async function uploadToS3(files, folder = '') {
    try {
        console.log("Uploading to S3");
        console.log(files);
        // Handle single file case
        if (!Array.isArray(files)) {
            files = [files];
        }

        const uploadPromises = files.map(async (file) => {
            const fileExtension = file.name.split('.').pop();
            const fileName = `fictionjs/${folder}${folder ? '/' : ''}${uuidv4()}.${fileExtension}`;
            console.log("File name: ", fileName);
            const params = {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: fileName,
                Body: fs.createReadStream(file.tempFilePath),
                ContentType: file.mimetype,
                ACL: 'public-read'
            };

            const result = await s3.upload(params).promise();
            
            // Clean up temp file after successful upload
            fs.unlink(file.tempFilePath, (err) => {
                if (err) console.error('Error cleaning up temp file:', err);
            });
            
            return result.Location;
        });

        const urls = await Promise.all(uploadPromises);
        
        // Return single URL for single file, array of URLs for multiple files
        return files.length === 1 ? urls[0] : urls;

    } catch (error) {
        console.error('Error uploading to S3:', error);
        // Clean up temp files even if upload fails
        files.forEach(file => {
            fs.unlink(file.tempFilePath, (err) => {
                if (err) console.error('Error cleaning up temp file:', err);
            });
        });
        throw new Error('Failed to upload file(s) to S3');
    }
}

export default uploadToS3;