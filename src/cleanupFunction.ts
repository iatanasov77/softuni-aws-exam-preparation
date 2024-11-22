import {SNSClient, PublishCommand} from '@aws-sdk/client-sns';
import {DynamoDBClient, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {v4} from 'uuid'

const snsClient = new SNSClient( {} );
const dynamoDBClient = new DynamoDBClient( {} );

export const handler = async ( event: any ) => {
    const tableName: string | undefined = process.env.TABLE_NAME;
    const topicArn: string | undefined = process.env.TOPIC_ARN;
    
    console.log( event );
    console.log( event.Records[0].dynamodb );
    const deletedRecord: string = JSON.stringify( event.Records[0].dynamodb, null, 2 ); // spacing level = 2
    
    await snsClient.send( new PublishCommand({
        TopicArn: topicArn,
        Message: `Invalid JSON deleted from ErrorTable: ${deletedRecord}`
    }));
        
    return {
        statusCode: 200,
        body: 'Hi from Lambda!'
    }
}