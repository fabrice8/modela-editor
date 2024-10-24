import type Frame from './frame'
import type { AddViewTriggerType, ViewBlockProperties, ViewComponent, ViewBridge } from '../types/view'

import EventEmitter from 'events'
import State from './state'
import {
  VIEW_KEY_SELECTOR,
  VIEW_NAME_SELECTOR,
  VIEW_ALLEY_SELECTOR,
  VIEW_ACTIVE_SELECTOR,
  VIEW_CAPTION_SELECTOR,
  VIEW_TYPES_ALLOWED_SELECTOR,
  
  CONTROL_PANEL_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_FLOATING_SELECTOR,
  
  CONTROL_EDGE_MARGIN,
  CONTROL_PANEL_MARGIN,
  CONTROL_TOOLBAR_MARGIN,
  VIEW_REF_SELECTOR,
  CONTROL_FLOATING_MARGIN
} from './constants'
import Stylesheet from './stylesheet'
import Component from './component'
import {
  Alley,
  Panel,
  Toolbar,
  Floating,
  FinderPanel,
  SearchResult,
  ToolbarInput,
  PanelInput,
  FloatingInput,
  FinderPanelInput,
  SearchResultInput
} from './factory'
import { debug, hashKey } from './utils'
import { FrameQuery } from '../lib/frame.window'

export default class View {
  /**
   * Access to frame's instance and 
   * relative functional classes.
   */
  private readonly frame: Frame

  /**
   * View's styles application handler
   */
  private styles?: Stylesheet 

  /**
   * Remote JQuery element object of the view.
   */
  public $$?: FrameQuery

  /**
   * Unique key identifying the view in
   * the editor context.
   */
  public key?: string

  /**
   * View component as original define.
   */
  private vc?: ViewComponent
  
  /**
   * Closes parent of this view that is also in
   * the editor context view.
   */
  private $parent?: JQuery<HTMLElement>

  /**
   * Between View & Component interaction bridge
   */
  public bridge: ViewBridge

  /**
   * Toolbar block component
   */
  private Toolbar?: Component<ToolbarInput>
  /**
   * Toolbar block component
   */
  private Panel?: Component<PanelInput>
  /**
   * Finder panel block component
   */
  private FinderPanel?: Component<FinderPanelInput>

  constructor( frame: Frame ){
    this.frame = frame
    
    this.bridge = {
      state: new State(),
      events: new EventEmitter(),
      assets: frame.flux.assets,
      fn: frame.flux.fn,
      i18n: frame.flux.i18n,
      css: undefined,
      $: undefined
    }
  }
  
  /**
   * Run initial 
   */
  private async initialize(){
    if( !this.$$ || !this.frame.$$ ) return

    try {
      /**
       * Initialize default styles of the view
       */
      const { name, styles } = this.get()
      if( name 
          && this.frame.$$head?.length
          && typeof styles === 'function' )
        this.styles =
        this.bridge.css = new Stylesheet( name, this.frame.$$head, styles( this.bridge ) )

      /**
       * Override bridge primary css interface methods
       * 
       * - .custom() return custom CSS properties of defined 
       *             in the document stylesheets
       * - .style() returns style properties of this view
       */
      if( this.bridge.css ){
        this.bridge.css.custom = async () => (await this.frame.remote?.customCSSProps() as ObjectType<string>)
        this.bridge.css.style = async () => (await this.frame.flux.fn.extractStyle( this.$$ as FrameQuery ))
      }
    }
    catch( error: any ){ debug( error.message ) }

    /**
     * Attach a next alley to the new view element
     */
    try {
      if( this.frame.flux.settings.enableAlleys
          && !(await this.$$.next(`[${VIEW_ALLEY_SELECTOR}="${this.key}"]`)).length ){
        
        /**
         * Use discret placehlder to no `absolute`, `fixed` or `sticky`
         * position elements to void unnecessary stack of relative alley
         * elements around static or relative position elements.
         */
        const freePositions = ['fixed', 'absolute', 'sticky']

        freePositions.includes( await this.$$.css('position') as string ) ?
                                      await this.$$.prepend( Alley({ key: this.key, discret: true }).template )
                                      : await this.$$.after( Alley({ key: this.key }).template )
      }
    }
    catch( error: any ){ debug( error.message ) }

    // Make view's remove JQuery object
    this.bridge.$ = this.$$

    // Give away control to view component
    const takeover = this.get('takeover')
    typeof takeover == 'function' && takeover( this.bridge )

    this.bridge.events.emit('mounted')
    debug('view initialized')

    // Record history stack
    this.frame.pushHistoryStack()

    /**
     * Override bridge primary fn interface methods
     */
    if( this.bridge.fn ){
      this.bridge.fn.updateToolbar = ( updates: ObjectType<any> ) => {
        /**
         * Attach `options.` scope to update options' keys
         */
        const _updates: ObjectType<any> = {}

        Object
        .entries( updates )
        .map( ([ key, value ]) => _updates[`options.${key}`] = value)

        this.Toolbar?.subInput( _updates )
      }
      this.bridge.fn.pushHistoryStack = () => this.frame.pushHistoryStack()
    }
  }

  set( values: any ){
    if( typeof values !== 'object' 
        || !Object.keys( values ).length )
      throw new Error('Invalid method argument')

    this.vc = this.vc ? { ...this.vc, ...values } : values
    debug('view component - ', this.vc )
  }
  get( type?: keyof ViewComponent ): any {
    if( !this.vc )
      throw new Error('Invalid method called')

    return type ? this.vc[ type ] : this.vc
  }

  /**
   * Map out a normal HTML element to editor
   * context view using native views cognition
   * process.
   */
  async inspect( $$this: FrameQuery, name: string, activate = false ){
    debug('current target - ', $$this.length )

    this.$$ = $$this
    if( !this.$$.length )
      throw new Error('Invalid View Element')
    
    /**
     * Mount inspected view into editor context
     */
    this.key = await this.$$.attr( VIEW_KEY_SELECTOR )
    if( !this.key ){
      /**
       * Generate and assign view tracking key
       */
      this.key = await hashKey()

      await this.$$.attr({
        [VIEW_KEY_SELECTOR]: this.key, // Set view key
        [VIEW_NAME_SELECTOR]: name // Set view node name identify
      })
    }

    if( !this.vc ){
      // Set view specifications
      this.set( await this.frame.flux.store.getView( name ) )
      // Initialize view properties
      this.initialize()
    }

    // Auto-trigger current view
    activate && await this.trigger()
  }
  /**
   * Mount new view comopnent into the DOM
   */
  async mount( vc: ViewComponent, to: string, triggerType: AddViewTriggerType = 'self' ){
    if( !this.frame.$$ ) return

    /**
     * `to` field should only be a model-view-key to be
     * sure the destination view is within editor control
     * scope.
     */
    const $$to = await this.frame.$$(`[${triggerType == 'alley' ? VIEW_REF_SELECTOR : VIEW_KEY_SELECTOR}="${to}"]`)
    if( !$$to.length )
      throw new Error(`Invalid destination view - <key:${to}>`)
    
    if( typeof vc.render !== 'function' )
      throw new Error(`<${vc.name}> render function not specified`)
    
    /**
     * Render new element with default component and 
     * defined global settings
     */
    const element = vc.render( this.bridge )
    debug('mount view - ', element )

    // Add view to the DOM
    this.$$ = await this.frame.$$(element)

    switch( triggerType ){
      case 'alley':
      case 'discret': await $$to.after( this.$$ ); break
      case 'self':
      default: await $$to.append( this.$$ )
    }

    /**
     * Generate and assign tracking key to the 
     * new view
     */
    this.key = await hashKey()

    await this.$$.attr({
      [VIEW_KEY_SELECTOR]: this.key, // Set view key
      [VIEW_NAME_SELECTOR]: vc.name // Set view node name identify
    })

    /**
     * Extract defined view blocks props
     */
    const renderingProps = this.frame.flux.fn.extractProperties( element )
    this.inject( renderingProps )

    // Set view specifications
    this.set( vc )
    // Initialize view properties
    this.initialize()
    // Auto-trigger current view
    await this.trigger()
  }
  /**
   * Create a clone/duplicate of an extisin view
   * in the editor context.
   */
  async mirror( viewInstance: View, $$nextTo?: FrameQuery ){
    /**
     * Argument must be a new instance of view class
     */
    if( typeof viewInstance !== 'object' 
        || !viewInstance.key
        || !viewInstance.$$
        || this.key )
      return

    // Clone view element
    this.$$ = await viewInstance.$$.clone()
    if( !this.$$.length )
      throw new Error('View instance HTML element not found')

    debug('mirror view - ', this.$$.length )

    /**
     * Add cloned view next to a given view element 
     * at a specific position
     */
    if( $$nextTo?.length ){
      /**
       * Add next to the view's attached alley 
       * or the view itself if no alley.
       */
      if( await (await $$nextTo.next()).is(`[${VIEW_ALLEY_SELECTOR}]`) )
        $$nextTo = await $$nextTo.next()
      
      await $$nextTo.after( this.$$ )
    }
    // Append cloned view directly next to the original view
    else await (await viewInstance.$$.parent()).append( this.$$ )

    /**
     * Generate and assign view tracking key
     */
    this.key = await hashKey()
    await this.$$.attr( VIEW_KEY_SELECTOR, this.key )

    // Clone view specifications
    this.set( viewInstance.get() )
    // Initialize view properties
    this.initialize()
  }

  setParent( parent: HTMLElement ){
    if( !parent ) return

    this.$parent = $(parent)
    debug('parent target - ', parent )

    // Get parent's default component

    // Auto-trigger current view's parent
    this.triggerParent()
  }
  getParent(){
    return this.$parent
  }

  inject( props: ViewBlockProperties[] ){
    if( !Array.isArray( props ) || !props.length ) return

    props.forEach( async each => {
      if( !this.$$ ) return

      if( !each.selector ){
        each.caption && await this.$$.data( VIEW_CAPTION_SELECTOR, each.caption )
        each.allowedViewTypes && this.$$.data( VIEW_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
        each.addView
        && this.frame.flux.settings.enableAlleys
        && await this.$$.append( Alley().template )

        return
      }

      /**
       * Assign props to specified content blocks
       */
      const $block = await this.$$.find( each.selector )

      each.caption && await $block.data( VIEW_CAPTION_SELECTOR, each.caption )
      each.allowedViewTypes && await $block.data( VIEW_TYPES_ALLOWED_SELECTOR, each.allowedViewTypes )
      each.addView
      && this.frame.flux.settings.enableAlleys
      && await $block.append( Alley().template )
    } )
  }
  async destroy(){
    if( !this.$$?.length ) 
      throw new Error('Invalid method called')
    
    // Dismiss controls related to the view
    await this.dismiss()

    try {
      // Remove alley attached to the view
      await (await this.$$.next(`[${VIEW_ALLEY_SELECTOR}]`)).remove()
      // Remove visible floating active
      await (await this.frame.$$body?.find(`[${CONTROL_FLOATING_SELECTOR}="${this.key}"]`))?.remove()
    }
    catch( error ){}

    // Remove element from the DOM
    await this.$$.remove()

    /**
     * Clear all namespaces styles attached to this
     * viwe element if there are no other instances of 
     * this view in the DOM.
     */
    this.styles?.clear()

    this.$$ = undefined
    this.vc = undefined
    this.key = undefined
    this.styles = undefined
    this.$parent = undefined

    // Record history stack
    this.frame.pushHistoryStack()
  }

  /**
   * Show view's editing toolbar
   */
  async showToolbar(){
    if( !this.frame.flux.$modela || !this.key || !this.$$ )
      throw new Error('Invalid method called')

    if( this.frame.flux.$modela.find(`[${CONTROL_TOOLBAR_SELECTOR}="${this.key}"]`).length ) 
      return

    const
    { toolbar, panel } = this.get() as ViewComponent,
    options = typeof toolbar == 'function' ? toolbar( this.bridge ) : {},
    settings = {
      editing: true,
      detached: typeof panel == 'function'
    }

    // Calculate toolbar position
    let { x, y, height } = await this.frame.getTopography( this.$$ )
    debug('show view toolbar: ', x, y )

    // Adjust by left edges
    if( x < 15 ) x = CONTROL_EDGE_MARGIN

    this.Toolbar = Toolbar({
      key: this.key,
      options,
      settings,
      position: { left: `${x}px`, top: `${y}px` }
    })
    let $toolbar = this.Toolbar.inject('append', this.frame.flux.$modela )

    const
    tHeight = $toolbar.find('> [container]').height() || 0,
    dueYPosition = tHeight + (CONTROL_TOOLBAR_MARGIN * 2)
    
    const
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0

    // Adjust by right edge
    if( x > (wWidth - tHeight) ) x = wWidth - tHeight - CONTROL_EDGE_MARGIN

    /**
     * Push slightly on top of element in normal position
     * but adjust below the element if it's to close to
     * the top edge.
     */
    if( height < (wHeight - tHeight) ){
      if( ( y - dueYPosition ) < CONTROL_EDGE_MARGIN ) y += height
      else y -= dueYPosition
    }
    // Adjust by the bottom edges
    if( y > (wHeight - tHeight) ) y = wHeight - tHeight - CONTROL_EDGE_MARGIN

    // Update toolbar position
    this.Toolbar.subInput({ position: { left: `${x}px`, top: `${y}px` } })
    // Fire show toolbar listeners
    this.bridge.events.emit('show.toolbar')
  }
  async showPanel(){
    if( !this.frame.flux.$modela || !this.key || !this.$$ ) 
      throw new Error('Invalid method called')

    if( this.frame.flux.$modela.find(`[${CONTROL_PANEL_SELECTOR}="${this.key}"]`).length ) 
      return

    const { caption, panel } = this.get() as ViewComponent
    if( typeof panel !== 'function' ) return

    // Calculate panel position
    let { x, y, width } = await this.frame.getTopography( this.$$ )
    debug('show view panel: ', x, y )

    this.Panel = Panel({
      caption,
      key: this.key,
      options: panel( this.bridge )
    })
    let $panel = this.Panel.inject('append', this.frame.flux.$modela )

    const
    pWidth = $panel.find('> [container]').width() || 0,
    pHeight = $panel.find('> [container]').height() || 0,
    // Window dimensions
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0,
    
    dueXPosition = pWidth + CONTROL_PANEL_MARGIN
    
    /**
     * Not enough space at the left, position at the right
     */
    if( ( x - dueXPosition ) < CONTROL_EDGE_MARGIN ){
      /**
       * Not enough space at the right either, position 
       * over view.
       */
      if( x + width + dueXPosition < wWidth )
        x += width + CONTROL_PANEL_MARGIN
    }
    // Adjust by left edges
    else x -= dueXPosition

    /**
     * Display panel in window view when element 
     * is position to close to the bottom.
     */
    if( ( y + pHeight + CONTROL_EDGE_MARGIN ) > wHeight )
      y -= pHeight
    
    // Adjust by the top edges
    else if( y < CONTROL_EDGE_MARGIN )
      y = CONTROL_EDGE_MARGIN
    
    // Update panel's position
    this.Panel.subInput({ position: { left: `${x}px`, top: `${y}px` } })
    // Fire show panel listeners
    this.bridge.events.emit('show.panel')
  }
  async showFloating(){
    if( !this.frame.flux.$modela || !this.key || !this.$$ )
      throw new Error('Invalid method called')

    if( this.frame.flux.$modela.find(`[${CONTROL_FLOATING_SELECTOR}="${this.key}"]`).length ) 
      return
    
    const triggers = ['addpoint']
    /**
     * Show paste-view trigger point when a pending
     * copy of view is in the clipboard.
     */
    if( this.frame.flux.workspace.clipboard?.type == 'view' )
      triggers.push('paste')

    const
    $$discret = await this.$$.find(`[${VIEW_ALLEY_SELECTOR}][discret]`),
    $$alley = $$discret.length ? $$discret : await this.$$.next(`[${VIEW_ALLEY_SELECTOR}]`)
    if( !$$alley.length ) return

    // Calculate floating position
    let { x, y } = await this.frame.getTopography( $$alley )

    let $floating: JQuery<HTMLElement>
    // Insert new floating point to the DOM
    if( !this.frame.flux.Floating ){
      this.frame.flux.Floating = Floating({ key: this.key, type: 'view', triggers })
      $floating = this.frame.flux.Floating.inject('append', this.frame.flux.$modela )
    }
    // Change key of currently floating point to new trigger's key
    else {
      this.frame.flux.Floating?.setInput({ key: this.key, type: 'view', triggers })
      $floating = this.frame.flux.Floating.$
    }

    const
    tWidth = !$$discret.length && $floating.find('> mul').width() || 0,
    dueXPosition = tWidth + CONTROL_FLOATING_MARGIN

    /**
     * Not enough space at the left, position at the right
     */
    if( ( x - dueXPosition ) >= 15 )
      x -= dueXPosition
    
    $floating.css({ left: `${x}px`, top: `${y}px` })
  }
  async showViewFinder( $trigger: JQuery<HTMLElement> ){
    if( !this.frame.flux.$modela || !this.key || !this.$$ )
      throw new Error('Invalid method called')

    /**
     * Put finder panel in position
     */
    let { x, y } = this.frame.flux.workspace.getTopography( $trigger )

    this.FinderPanel = FinderPanel({ key: this.key as string, list: this.frame.flux.store.searchView() })
    let $finder = this.FinderPanel.inject('append', this.frame.flux.$modela )

    const
    pWidth = $finder.find('> [container]').width() || 0,
    pHeight = $finder.find('> [container]').height() || 0,
    // Window dimensions
    wWidth = $(window).width() || 0,
    wHeight = $(window).height() || 0
    
    /**
     * Not enough space at the left, position at the right
     */
    if( x < CONTROL_EDGE_MARGIN )
      x = CONTROL_EDGE_MARGIN

    /**
     * Not enough space at the right either, position 
     * over view.
     */
    if( ( x + pWidth + CONTROL_EDGE_MARGIN ) > wWidth )
      x -= pWidth + CONTROL_EDGE_MARGIN

    /**
     * Display panel in window view when element 
     * is position to close to the bottom.
     */
    if( ( y + pHeight + CONTROL_EDGE_MARGIN ) > wHeight )
      y -= pHeight

    $finder.css({ left: `${x}px`, top: `${y}px` })

    /**
     * Search input event listener
     */
    const self = this
    let _searchResults: Component<SearchResultInput>

    $finder
    .find('input[type="search"]')
    .on('input', function( this: Event ){
      const query = String( $(this).val() )
      /**
       * Trigger search with minimum 2 character input value
       * but also allow empty input to redisplay default
       * result list.
       */
      if( query.length == 1 ) return

      const list = self.frame.flux.store.searchView( query )
      if( !_searchResults ){
        _searchResults = SearchResult({ list })

        const $results = $finder.find('.results')
        if( !$results.length ) return

        _searchResults.inject('append', $results.empty() )
      }
      else _searchResults.subInput({ list })
    })
  }
  async showMovable(){


    // Fire show movable listeners
    this.bridge.events.emit('show.movable')
  }
  
  async move( direction?: string ){
    if( !this.$$?.length || !this.key ) 
      throw new Error('Invalid method called')

    switch( direction ){
      case 'up': {
        const $$alley = await this.$$.next(`[${VIEW_ALLEY_SELECTOR}]`)
        /**
         * Check whether previous view above has alley then
         * point moving anchor to after the alley (view itself).
         */
        let $$anchor = (await this.$$.prev(`[${VIEW_ALLEY_SELECTOR}]`)).length ?
                                    await (await this.$$.prev(`[${VIEW_ALLEY_SELECTOR}]`)).prev()
                                    : await this.$$.prev()
                                       
        /**
         * In case this view is the last top element in its 
         * container.
         */
        if( !$$anchor.length ) return
        
        /**
         * Move this view and its alley to the view 
         * right above it in the same container
         */
        await $$anchor.before( this.$$ )
        $$alley?.length && await this.$$.after( $$alley )
      } break
      
      case 'down': {
        const $$alley = await this.$$.next(`[${VIEW_ALLEY_SELECTOR}]`)

        let $$anchor = $$alley?.length ?
                          await $$alley.next() // View right below the alley
                          : await this.$$.next()  
        /**
         * In case this view is the last bottom element in its 
         * container.
         */
        if( !$$anchor.length ) return

        /**
         * Check whether next view below has alley then
         * point moving anchor to the alley.
         */
        if( ( await $$anchor.next(`[${VIEW_ALLEY_SELECTOR}]`)).length )
          $$anchor = await $$anchor.next(`[${VIEW_ALLEY_SELECTOR}]`)
        
        /**
         * Move this view and its alley to the view 
         * right below it in the same container
         */
        await $$anchor.after( this.$$ )
        $$alley?.length && this.$$.after( $$alley )
      } break

      default: this.showMovable()
    }

    // Record history stack
    this.frame.pushHistoryStack()
  }
  async dismiss(){
    // Unhighlight triggered views
    await this.$$?.removeAttr( VIEW_ACTIVE_SELECTOR )
    // Remove editing toolbar if active
    this.Toolbar?.destroy()
    // Remove editing control panel if active
    this.Panel?.destroy()
    // Remove editing finder panel if active
    this.FinderPanel?.destroy()

    /**
     * Fire dismiss function provided with 
     * view component.
     */
    const dismiss = this.get('dismiss')
    typeof dismiss === 'function' && dismiss( this.bridge )
  }
  async trigger(){
    if( !this.key || !this.$$ ) return
    debug('trigger view')

    /**
     * Highlight triggered view: Delay due to 
     * pre-unhighlight effect.
     */
    await this.$$?.attr( VIEW_ACTIVE_SELECTOR, 'true' )

    /**
     * Fire activation function provided with 
     * view component.
     */
    this.bridge.events.emit('activate')
  }

  triggerParent(){
    if( !this.key ) return
    debug('trigger parent view')
    
  }
  dismissParent(){
    
  }
}