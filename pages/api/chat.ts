import {DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE} from '@/utils/app/const';
import {OpenAIError, OpenAIStream} from '@/utils/server';
import {ChatBody, Message} from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import {init, Tiktoken} from '@dqbd/tiktoken/lite/init';

export const config = {
    runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
    try {
        const {model, messages, key, prompt, temperature} = (await req.json()) as ChatBody;

        await init((imports) => WebAssembly.instantiate(wasm, imports));
        const encoding = new Tiktoken(
            tiktokenModel.bpe_ranks,
            tiktokenModel.special_tokens,
            tiktokenModel.pat_str,
        );

        let promptToSend = prompt;
        if (!promptToSend) {
            promptToSend = DEFAULT_SYSTEM_PROMPT;
        }

        let temperatureToUse = temperature;
        if (temperatureToUse == null) {
            temperatureToUse = DEFAULT_TEMPERATURE;
        }

        const prompt_tokens = encoding.encode(promptToSend);

        let tokenCount = prompt_tokens.length;
        let messagesToSend: Message[] = [];

        for (let i = messages.length - 1; i >= 0; i--) {
            const message = messages[i];
            const tokens = encoding.encode(message.content);

            if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
                break;
            }
            tokenCount += tokens.length;
            messagesToSend = [message, ...messagesToSend];
        }

        //log request headers
        const allowed = ['cf-access-authenticated-user-email', 'cf-ipcountry', 'cf-connecting-ip', 'x-amzn-trace-id', 'user-agent', 'host', 'x-forwarded-port', 'x-forwarded-proto', 'x-forwarded-for'];
        const all_headers = Object.fromEntries(req.headers);
        const filtered_headers = Object.keys(all_headers)
          .filter(key => allowed.includes(key))
          .reduce((obj: { [index: string]: any }, key) => {
            obj[key] = all_headers[key];
            return obj;
          }, {});
        const messageToLog = {
          messages: messages,
          timestamp: new Date().toISOString(),
          headers: filtered_headers,
          session_id: "session_id", // TODO: add session id
        };
        console.log(` CHAT MESSAGE LOG: ${JSON.stringify(messageToLog)}`)

        encoding.free();


        const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);

        return new Response(stream);
    } catch (error) {
        console.error(error);
        if (error instanceof OpenAIError) {
            return new Response('Error', {status: 500, statusText: error.message});
        } else {
            return new Response('Error', {status: 500});
        }
    }
};

export default handler;
