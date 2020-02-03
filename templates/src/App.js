import React from 'react'
import { Global, css } from '@emotion/core'

const globalStyles = css`
  html,
  body {
    padding: 0;
    margin: 0;
    font-family: sans-serif;
  }
`

/**
 * @param {object} props
 */
export default function App () {
  return (
    <>
      <Global styles={globalStyles} />
      <h1>Hello World</h1>
    </>
  )
}
