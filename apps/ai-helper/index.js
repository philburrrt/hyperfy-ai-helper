import React, { useState, useEffect } from 'react'
import { useWorld, useSyncState, useFields } from 'hyperfy'

const OPENAI_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-3.5-turbo'

// initial prompt needs to contain instructions on how to respond
const INITIAL_PROMPT = (name, age, gender, personality, interests, prompt) => {
  return [
    {
      role: 'user',
      content: `
        Respond as a fictional human with the following characteristics:
        Name: ${name}
        Age: ${age}
        gender: ${gender}
        personality: ${personality}
        interests: ${interests}
        Never break character. This will be the first message of the conversation:
        ${prompt}
      `,
    },
  ]
}

// sends a chat message that only the local user can see
const debugChat = (msg, world) => {
  world.chat(msg, false, true)
}

export default function App() {
  const world = useWorld()
  const fields = useFields()
  const [messages, setMessages] = useState(null)
  const [response, setResponse] = useState(null)
  // fields from in world editor
  const {
    name,
    age,
    gender,
    personality,
    interests,
    maxTokens,
    apiKey,
    temp,
    presencePenalty,
    frequencyPenalty,
  } = fields

  // when the response state changes, send response to chat and add it to the messages log
  useEffect(() => {
    if (!response) return
    debugChat(`${name}: ${response.content}`, world)
    setMessages([...messages, response])
  }, [response])

  // when the user sends a message, check if it mentions the bot
  // then send the message to the OpenAI API
  useEffect(() => {
    if (!world.isClient) return
    return world.on('chat', msg => {
      const { text, from } = msg
      if (from === name) return
      if (text.includes(`@${name}`)) {
        const prompt = text.split(`@${name}`)[1]
        getResponse(prompt)
      }
    })
  }, [])

  // send a request to the OpenAI API
  const getResponse = async prompt => {
    if (!name || !age || !gender || !personality || !interests || !apiKey)
      return debugChat(`${name}: Please fill out all fields`, world)
    let message
    // if this is the first message, send the initial prompt
    if (!messages) {
      message = INITIAL_PROMPT(
        name,
        age,
        gender,
        personality,
        interests,
        prompt
      )
      setMessages(message)
    } else {
      // otherwise, add the new message to the messages log
      message = {
        role: 'user',
        content: prompt,
      }
      setMessages([...messages, message])
      message = [...messages, message]
    }
    try {
      debugChat(`${name}: I'm thinking...`, world)
      const response = await world.http({
        method: 'POST',
        url: `${OPENAI_URL}/chat/completions`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        data: {
          model: OPENAI_MODEL,
          messages: message,
          max_tokens: maxTokens || 100,
          temperature: temp || 0.2, // openai defualts to 0.8. lower is better for chatbots
          presence_penalty: presencePenalty || 0.0,
          frequency_penalty: frequencyPenalty || 0.0,
        },
      })
      if (!response?.choices?.length)
        return debugChat(`${name}: No response`, world)
      // ignoring all options except the first
      const answer = response?.choices[0].message
      setResponse(answer)
    } catch (e) {
      console.error(`${name}:`, e.message, world)
    }
  }

  // returns nothing because the interface is the chat box
  return <app></app>
}

const initialState = {
  // ...
}

export const getStore = (state = initialState) => {
  return {
    state,
    actions: {},
    fields: [
      {
        key: 'name',
        label: 'Name',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'age',
        label: 'Age',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'gender',
        label: 'Gender',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'personality',
        label: 'Personality',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'interests',
        label: 'Interests',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'ai-settings',
        label: 'OpenAI Settings',
        type: 'section',
      },
      {
        key: 'apiKey',
        label: 'API Key',
        type: 'text',
        placeholder: 'Required...',
      },
      {
        key: 'maxTokens',
        label: 'Max Tokens',
        type: 'text',
        placeholder: '100',
      },
      {
        key: 'temp',
        label: 'Temperature',
        type: 'text',
        placeholder: '0.2',
      },
      {
        key: 'presencePenalty',
        label: 'Presence Penalty',
        type: 'text',
        placeholder: '0.0',
      },
      {
        key: 'frequencyPenalty',
        label: 'Frequency Penalty',
        type: 'text',
        placeholder: '0.0',
      },
    ],
  }
}
