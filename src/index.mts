import 'dotenv/config'
import { main } from './main.mjs'

main()
  .then(() => {
    console.log('Done')

    const sleep = (ms: number | undefined) => new Promise((resolve) => setTimeout(resolve, ms))

    sleep(1000)

    console.log('1 second have elapsed')
  })
  .catch((error) => {
    console.error('Error', error)
  })
