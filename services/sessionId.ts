import { v4 as uuidv4 } from 'uuid';


const setSessionID = () => {
    localStorage?.setItem('sessionId', uuidv4())
}


export const getSessionId = () => {
    if(!localStorage?.getItem('sessionId')) {
        setSessionID()
    }

    return localStorage?.getItem('sessionId')
}
