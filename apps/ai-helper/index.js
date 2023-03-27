import React, { useState, useEffect } from 'react'
import { useWorld, useSyncState, useFields } from 'hyperfy'

const OPENAI_URL = 'https://api.openai.com/v1'
const OPENAI_MODEL = 'gpt-3.5-turbo'

// initial prompt needs to contain instructions on how to respond
const injectPrompt = (aiName, age, gender, personality, interests, prompt) => {
  return [
    {
      role: 'user',
      content: `
        Respond as a fictional human with the following characteristics:
          Name: ${aiName}
          Age: ${age}
          Gender: ${gender}
          Personality: ${personality}
          Interests: ${interests}

        This is the message you will be responding to:
        ${prompt}
      `,
    },
  ]
}

// sends a chat message that only the local user can see
const debugChat = (msg, world) => {
  world.chat(msg, true)
}

export default function App() {
  const world = useWorld()
  const fields = useFields()
  const [messages, setMessages] = useState(null)
  const [response, setResponse] = useState(null)
  // fields from in world editor
  const {
    aiName,
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
    debugChat(`${aiName}: ${response.content}`, world)
    setMessages([...messages, response])
  }, [response])

  // when the user sends a message, check if it mentions the bot
  // then send the message to the OpenAI API
  useEffect(() => {
    if (!world.isClient) return
    return world.on('chat', msg => {
      const { text, fromId } = msg
      const { uid } = world.getAvatar()
      if (fromId !== uid) return
      if (text.includes(`@${aiName}`)) {
        const prompt = text.split(`@${aiName}`)[1]
        getResponse(prompt)
      }
    })
  }, [])

  // send a request to the OpenAI API
  const getResponse = async prompt => {
    if (!aiName || !age || !gender || !personality || !interests || !apiKey)
      return debugChat(`${aiName}: Please fill out all fields`, world)
    let message
    message = injectPrompt(aiName, age, gender, personality, interests, prompt)
    if (!messages) {
      setMessages(message)
    } else {
      setMessages([...messages, message])
      message = [...messages, message]
    }
    try {
      debugChat(`${aiName}: I'm thinking...`, world)
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
        return debugChat(`${aiName}: No response`, world)
      // ignoring all options except the first
      const answer = response?.choices[0].message
      setResponse(answer)
    } catch (e) {
      console.error(`${aiName}:`, e.message, world)
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
        key: 'aiName',
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
        type: 'float',
        initial: 100,
      },
      {
        key: 'temp',
        label: 'Temperature',
        type: 'float',
        initial: 0.2,
      },
      {
        key: 'presencePenalty',
        label: 'Presence Penalty',
        type: 'float',
        initial: 0,
      },
      {
        key: 'frequencyPenalty',
        label: 'Frequency Penalty',
        type: 'float',
        initial: 0,
      },
    ],
  }
}
