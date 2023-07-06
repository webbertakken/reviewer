import 'dotenv/config'
import { main } from './main'

main()
  .then(() => {
    console.log('Done')
  })
  .catch((error) => {
    console.error('Error', error)
  })
