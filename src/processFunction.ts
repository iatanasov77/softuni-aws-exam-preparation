import {SNSClient, PublishCommand} from '@aws-sdk/client-sns';
import {DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {v4} from 'uuid'

const snsClient = new SNSClient( {} );
const dynamoDBClient = new DynamoDBClient( {} );

export const handler = async ( event: any ) => {
    const tableName: string | undefined = process.env.TABLE_NAME;
    const topicArn: string | undefined = process.env.TOPIC_ARN;
    
    console.log( event );
    const body = JSON.parse( event.body );
    
    if ( ! body || ! body.text ) {
        // Invalid JSON
        const ttl: number = Math.floor( Date.now() / 1000 ) + 30 * 60;
        
        await dynamoDBClient.send( new PutItemCommand({
            TableName: tableName,
            Item: {
                id: {
                    S: v4(),
                },
                errorMessage: {
                    S: 'Somthing is wrong!',
                },
                TTL: {
                    N: ttl.toString(),
                }
            }
        }));
    } else {
        // Publish to SNS
        await snsClient.send( new PublishCommand({
            TopicArn: topicArn,
            Message: `Valid JSON recieved: ${body.text}`
        }));
    }

    return {
        statusCode: 200,
        body: 'Hi from Lambda!'
    }
}