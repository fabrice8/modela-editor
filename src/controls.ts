import type Modela from './modela'
import * as Event from './events'
import {
  CONTROL_ROOT,
  VIEW_IDENTIFIER,
  VIEW_ACTIVE_SELECTOR,
  VIEW_PLACEHOLDER_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_BLOCK_SELECTOR
} from './constants'
import { createControlLayer } from './block.factory'

export default class Controls {
  readonly flux: Modela

  $globalBlock?: JQuery<HTMLElement>
  $globalToolbar?: JQuery<HTMLElement>
  
  /**
   * Copy element clipboard
   */
  clipboard: ClipBoard | null = null

  constructor( flux: Modela ){
    this.flux = flux
  }
  
  /**
   * Enable control actions' event listeners
   */
  enable(){
    // Add editor controls to root container in the DOM
    this.flux.$modela = $(createControlLayer())

    // Apply translation to text contents in modela control layer
    this.flux.$modela = this.flux.i18n.propagate( this.flux.$modela, 'mlang' )
    $('body').prepend( this.flux.$modela )

    this.$globalBlock = $(`${CONTROL_ROOT} [${CONTROL_BLOCK_SELECTOR}="global"]`)
    this.$globalToolbar = $(`${CONTROL_ROOT} [${CONTROL_TOOLBAR_SELECTOR}="global"]`)

    /**
     * Propagate view control over the existing content
     */
    this.flux.$root && this.flux.views.propagate( this.flux.$root )

    // Activate all inert add-view placeholders
    this.setPlaceholders('active')
    // Initialize event listeners
    this.events()
  }

  events(){
    if( !this.flux.$modela
        || !this.flux.$root
        || !this.flux.$root.length
        || !this.flux.$modela.length
        || !this.flux.views ) return

    /**
     * Listen to View components or any editable tag
     */
    const selectors = `${this.flux.settings.viewOnly ? VIEW_IDENTIFIER : ''}:not([${VIEW_PLACEHOLDER_SELECTOR}],[${CONTROL_PANEL_SELECTOR}] *)`
    this.flux.settings.hoverSelect ?
              this.flux.$root.on('mouseover', selectors, this.flux.views.lookup.bind( this.flux.views ) )
              : this.flux.$root.on('click', selectors, this.flux.views.lookup.bind( this.flux.views ) )

    const self = this
    function handler( fn: Function ){
      return function( this: Event ){
        typeof fn === 'function' && fn( $(this), self )
      }
    }

    function wildEvents( $layer: JQuery<HTMLElement> ){
      if( !$layer.length ) return

      $layer
      /**
       * Tab event trigger
       */
      .on('click', '[tab]', handler( Event.onTab ) )
      /**
       * Show event trigger
       */
      .on('click', '[show]', handler( Event.onShow ) )
      /**
       * Apply event trigger
       */
      .on('click', '[apply]', handler( Event.onApply ) )
      /**
       * Action event trigger
       */
      .on('click', '[action]', handler( Event.onAction ) )
      /**
       * Dismiss event trigger
       */
      .on('click', '[dismiss]', handler( Event.onDismiss ) )
      /**
       * Custom `on-*` event trigger
       */
      .on('click', '[on]', handler( Event.onCustomListener ) )
    }

    async function onUserAction( e: any ){
      if( e.defaultPrevented ) return

      switch( e.type || e.key ){
        // case 'ArrowDown': break
        // case 'ArrowUp': break
        // case 'ArrowLeft': break
        // case 'ArrowRight': break
        // case 'Escape': break

        case 'Enter': await self.flux.history.record( $(e).html() ); break
        case 'Tab': await self.flux.history.record( $(e).html() ); break
        case ' ': await self.flux.history.record( $(e).html() ); break

        // case 'Backspace': break
        // case 'Clear': break
        // case 'Copy': break
        // case 'CrSel': break
        // case 'Cut': break
        // case 'Delete': break
        // case 'EraseEof': break
        // case 'ExSel': break
        // case 'Insert': break
        // case 'Paste': await self.flux.history.record( $(e).html() ); break
        // case 'Redo': break
        // case 'Undo': break

        // More key event values
        // https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values

        // case 'paste': await self.flux.history.record( $(e).html() ); break

        // Key event can't be handled
        default: return
      }

      e.preventDefault()
    }

    this.flux.$root
    /**
     * Show extra and sub toolbar options
     */
    .on('click', `[${VIEW_ACTIVE_SELECTOR}]`, handler( Event.onToolbar ) )
    /**
     * Show floating triggers on placeholder hover
     */
    .on('mouseenter', `[${VIEW_PLACEHOLDER_SELECTOR}]`, handler( Event.onFloating ) )

    .on('input', '[contenteditable]', handler( Event.onContentChange ) )
    .on('keydown', onUserAction )
    .on('paste', onUserAction )

    /**
     * Declare wild events: Same events available from every
     * layer of the editor.
     * 
     * - editing context root
     * - editor controls layer
     */
    wildEvents( this.flux.$root )
    wildEvents( this.flux.$modela )
  }

  destroy(){
    // Disable add-view placeholders
    this.setPlaceholders('inert')

    this.flux.$modela?.off()
    this.flux.$modela?.remove()

    this.flux.$root?.off()
  }

  /**
   * Set general state of placeholders
   * 
   * - active: Enable add-view placeholders highlighting during editing
   * - inert: Disable add-view placeholders
   */
  setPlaceholders( status = 'active' ){
    if( !this.flux.settings.enablePlaceholders ) return
    $(`[${VIEW_PLACEHOLDER_SELECTOR}]`).attr('status', status )
  }
}
