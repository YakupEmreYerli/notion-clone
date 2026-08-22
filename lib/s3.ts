import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * S3-compatible object storage (MinIO by default).
 *
 * Objects are kept private; they are streamed back to the browser through
 * /api/files/<key> so nothing but the app itself needs to be reachable from
 * the outside. That also keeps published/preview pages working.
 */

const globalForS3 = globalThis as unknown as { s3Client?: S3Client };

export const S3_BUCKET = process.env.S3_BUCKET || "zotion";

export const getS3Client = () => {
  if (globalForS3.s3Client) return globalForS3.s3Client;

  const endpoint = process.env.S3_ENDPOINT;

  if (!endpoint) {
    throw new Error("S3_ENDPOINT is not set.");
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION || "us-east-1",
    // MinIO needs path-style addressing (http://minio:9000/<bucket>/<key>).
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    },
  });

  globalForS3.s3Client = client;
  return client;
};

export const putObject = async (
  key: string,
  body: Buffer,
  contentType: string,
) => {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
};

export const getObject = (key: string) =>
  getS3Client().send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));

export const deleteObject = (key: string) =>
  getS3Client().send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
