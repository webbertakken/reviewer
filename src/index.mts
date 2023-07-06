import 'dotenv/config'
import { main } from './main.mjs'

main()
  .then(() => {
    console.log('Done')
  })
  .catch((error) => {
    console.error('Error', error)
  })
