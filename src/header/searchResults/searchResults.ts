import * as $ from 'jquery'
import { compact, filter, forEach, get, indexOf, isArray, isFinite, set, template } from 'lodash'

const resultsHtml = require('./searchResults.html')

const templateVenue = template(require('./templates/venue.html'))
const templatePlace = template(require('./templates/place.html'))
const templatePlaceList = template(require('./templates/placeList.html'))

import { ITEMPIXEL, ITEMSTOSCROLL } from '../../constants'
import { DefaultControl } from '../../control'
import { translate } from '../../translate'
import { getIcon, getMainFroms, getMainSearches, getTranslation } from '../../utils'

let itemSelected: any

export class SearchResults extends DefaultControl {

  private userLocationCallback: (searchResult: any, universe?: any) => void

  constructor (mapInstance: any, options: any) {
    super(mapInstance)

    this._container = $(resultsHtml)

    this.listen('click', '#mwz-use-user-location', this._clickOnUserLocation.bind(this))
  }
  public remove (): void {
    return null
  }

  public getDefaultPosition (): string {
    return 'top-left'
  }

  public setResults (results: string | any[], clickOnResultCallback: (searchResult: any, universe?: any) => void, focusedField: string) {
    itemSelected = 0
    if (results === 'mainSearches') {
      this._showMainSearchIfAny(clickOnResultCallback)
    } else if (results === 'mainFroms') {
      this._showMainFromIfAny(clickOnResultCallback)
    } else if (isArray(results)) {
      this._showSearchResult(results, (universe: any) => {
        return (clicked: any) => {
          clickOnResultCallback(clicked, universe)
        }
      })
    }

    this._showUserLocationButtonIfPossible(focusedField, clickOnResultCallback)
  }

  public showLoading () {
    this._container.find('#mwz-search-loading').show()
  }
  public hideLoading () {
    this._container.find('#mwz-search-loading').hide()
  }

  public refreshLocale () {
    if (this._map) {
      // need to refresh 'on floor' string in search results
    }
  }

  public enterKeyup () {
    const elementSelected = this._container.find('#mwz-search-results-container a')[itemSelected - 1]
    this._container.find(elementSelected).click()
    $(this.map._container).find('#mwz-mapwize-search').blur()
  }

  public upArrow () {
    const searchResults = this._container.find('#mwz-search-results-container a')
    const pastItemSelected = searchResults[itemSelected - 1]
    let nextItemToSelect

    if (itemSelected <= searchResults.length && itemSelected > 1) {
      nextItemToSelect = searchResults[itemSelected - 2]
      itemSelected--
    } else {
      nextItemToSelect = searchResults[searchResults.length - 1]
      itemSelected = searchResults.length
    }

    this._container.find(pastItemSelected).removeClass('mwz-item-selected')
    this._container.find(nextItemToSelect).addClass('mwz-item-selected')
    this.setScroll()

  }

  public downArrow () {
    const searchResults = this._container.find('#mwz-search-results-container a')
    const pastItemSelected = searchResults[itemSelected - 1]
    let nextItemToSelect

    if (itemSelected < searchResults.length && itemSelected >= 0) {
      nextItemToSelect = searchResults[itemSelected]
      itemSelected++
    } else {
      nextItemToSelect = searchResults[0]
      itemSelected = 1
    }

    this._container.find(pastItemSelected).removeClass('mwz-item-selected')
    this._container.find(nextItemToSelect).addClass('mwz-item-selected')
    this.setScroll()
  }

  public setScroll () {
    const searchResultContainer = this._container.find('#mwz-search-results-container li')
    let itemPixel = ITEMPIXEL

    if (searchResultContainer.length > 0) {
      itemPixel = itemPixel + 10
    }

    const scrollPixel = ((ITEMSTOSCROLL - 1) * itemPixel) * Math.floor(itemSelected / ITEMSTOSCROLL)
    $(this.map._container).find('#mwz-search-results').animate({ scrollTop: scrollPixel }, 250)
  }

  // ---------------------------------------
  // Privates methods
  // ---------------------------------------

  private _clickOnUserLocation () {
    if (this.userLocationCallback) {
      this.userLocationCallback({ objectClass: 'userLocation' })
    }
  }

  private _showUserLocationButtonIfPossible (focusedField: string, clickOnResultCallback: (searchResult: any, universe?: any) => void) {
    const userLocation = this.map.getUserLocation()
    if (focusedField === 'from' && userLocation && isFinite(userLocation.floor)) {
      this._container.find('#mwz-use-user-location').show().find('button').text(translate('use_current_location'))
      this.userLocationCallback = clickOnResultCallback
    } else {
      this._container.find('#mwz-use-user-location').hide()
      this.userLocationCallback = null
    }
  }

  private _showMainSearchIfAny (onClick: (searchResult: any, universe?: any) => void) {
    const venue = this.map.getVenue()
    const resultContainer = this._container.find('#mwz-search-results-container')
    resultContainer.html('')

    if (venue.mainSearches.length) {
      this.showLoading()

      getMainSearches(venue.mainSearches).then((mainSearches: any[]) => {
        resultContainer.html('')
        forEach(compact(mainSearches), (mainSearch: any) => {
          resultContainer.append(this._mapwizeObjectResults(mainSearch, onClick))
        })
        this.hideLoading()
      })
    }
  }
  private _showMainFromIfAny (onClick: (searchResult: any, universe?: any) => void) {
    const venue = this.map.getVenue()
    const resultContainer = this._container.find('#mwz-search-results-container')
    resultContainer.html('')

    if (venue.mainFroms.length) {
      this.showLoading()

      getMainFroms(venue.mainFroms).then((mainFroms: any[]) => {
        resultContainer.html('')
        forEach(compact(mainFroms), (mainFrom: any) => {
          resultContainer.append(this._mapwizeObjectResults(mainFrom, onClick))
        })
        this.hideLoading()
      })
    }
  }
  private _showSearchResult (results: any[], onClick: (universe: any) => (clickedResult: any) => void) {
    const venue = this.map.getVenue()
    const lang = this.map.getLanguage() || this.map.getPreferredLanguage()
    const resultContainer = this._container.find('#mwz-search-results-container')

    let [query, mapwize] = results

    resultContainer.html('')

    if (venue && mapwize.length) {
      mapwize = this._resultsByUniverse(mapwize)
      const currentUniverse = this.map.getUniverse()
      forEach(mapwize, (resultsByUniverse: any) => {
        // display universe header only if needed (see maps condition)
        if (mapwize.length > 1 || get(resultsByUniverse, 'universe._id') !== currentUniverse._id) {
          resultContainer.append($('<li class="list-group-item list-group-item-secondary">' + get(resultsByUniverse, 'universe.name') + '</li>'))
        }
        forEach(resultsByUniverse.results, (mwzResult: any) => {
          if (getTranslation(mwzResult, lang, 'title')) {
            resultContainer.append(this._mapwizeObjectResults(mwzResult, onClick(resultsByUniverse.universe)))
          }
        })
      })
    } else {
      forEach(mapwize, (mwzResult: any) => {
        if (getTranslation(mwzResult, lang, 'title')) {
          resultContainer.append(this._mapwizeObjectResults(mwzResult, onClick(null)))
        }
      })
    }
  }

  private _mapwizeObjectResults (mwzObject: any, onClick: (clickedResult: any) => void) {
    const lang = this.map.getLanguage() || this.map.getPreferredLanguage()
    const options = {
      floor: isFinite(mwzObject.floor) ? translate('on_floor', { floor: mwzObject.floor }) : '',
      icon: getIcon(mwzObject),
      subtitle: getTranslation(mwzObject, lang, 'subTitle'),
      title: getTranslation(mwzObject, lang, 'title'),
    }
    let templated = null

    if (mwzObject.objectClass === 'venue') {
      templated = templateVenue(options)
    } else if (mwzObject.objectClass === 'place') {
      templated = templatePlace(options)
    } else if (mwzObject.objectClass === 'placeList') {
      templated = templatePlaceList(options)
    }

    return $(templated).on('click', (e: any) => {
      e.preventDefault()
      return onClick(mwzObject)
    })
  }

  private _resultsByUniverse (mwzResults: any[]) {
    const venue = this.map.getVenue()
    const resultsByUniverse: any[] = []
    forEach(venue.accessibleUniverses, (universe: any) => {
      const resultInUniverse = filter(mwzResults, (result: any) => {
        return indexOf(result.universes, universe._id) !== -1
      })

      if (resultInUniverse.length) {
        resultsByUniverse.push({
          results: resultInUniverse,
          universe,
        })
      }
    })
    return resultsByUniverse
  }
}
