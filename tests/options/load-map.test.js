const { mwzTest, initBrowser, killBrowser } = require('../core/utils')

const testSuites = 'Displaying a map'
describe(testSuites, () => {
  beforeAll(() => {
    return initBrowser(testSuites)
  })

  afterAll(() => {
    return killBrowser(testSuites)
  })

  mwzTest(testSuites, 'Simple example (only apiKey)', (page) => {
    return () => {
      MapwizeUI.map({
        apiKey: 'ContexeoDevAppAPIKEY'
      }).then((map) => {
        window.callbackTest(null)
      }).catch(window.callbackTest)
    }
  })

})