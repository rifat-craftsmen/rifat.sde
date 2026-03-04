import 'dotenv/config'
import { app } from './app.js'

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Environment : ${process.env.NODE_ENV}`)
  console.log(`DynamoDB    : ${process.env.DYNAMODB_ENDPOINT || 'AWS'}`)
  console.log(`CORS origin : ${process.env.CORS_ORIGIN}`)
})
