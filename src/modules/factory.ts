import type { ViewCaption } from '../types/view'
import {
  VIEW_REF_SELECTOR,
  VIEW_ALLEY_SELECTOR,
  VIEW_CONTROL_OPTIONS,

  CONTROL_LANG_SELECTOR,
  CONTROL_PANEL_SELECTOR,
  CONTROL_TOOLBAR_SELECTOR,
  CONTROL_FLOATING_SELECTOR,
  
  FORM_INPUT_SELECTOR,
  FORM_SEPERATOR_SELECTOR,
  CONTROL_FRAME_SELECTOR,
  VIEW_EMPTY_SELECTOR,
  FRAME_BLANK_DOCUMENT
} from './constants'
import { generateKey } from './utils'
import { FrameOption } from '../types/frame'
import Component from './component'

export type WorkspaceLayerInput = {

}
export const WorkspaceLayer = ( input: WorkspaceLayerInput ) => {
  const template = `<modela>
    <mboard></mboard>
    ${createGlobal()}
  </modela>`

  return new Component<WorkspaceLayerInput>( template, { input })
}

export const createGlobal = () => {
  const globalBlock = `<mblock container>
  </mblock>`
  
  /**
   * 
   */
  return `<mglobal>
    <minline show="global"><micon class="bx bx-dots-vertical-rounded"></micon></minline>

    <mblock dismiss="global" backdrop></mblock>
    ${globalBlock}
  </mglobal>`
}

export const createFrame = ( key: string, options: FrameOption ) => {
  /**
   * User `srcdoc` to inject default HTML skeleton
   * into the iframe if `option.source` isn't provided.
   */
  const source = options.source ?
                      `src="${options.source}"` // Source URL provided
                      : `src="data:text/html;charset=utf-8,${encodeURI( FRAME_BLANK_DOCUMENT )}"` // Default HTML Document skeleton
  
  return `<mframe ${CONTROL_FRAME_SELECTOR}="${key}">
    <mul>
      <mli action="frame.edit"><micon class="bx bx-edit-alt"></micon></mli>
      <mli action="frame.delete"><micon class="bx bx-trash"></micon></mli>
    </mul>

    <mblock>
      <iframe ${source}
              title="${options.title || `Frame ${key}`}"
              importance="high"
              referrerpolicy="origin"
              allow="geolocation"
              sandbox="allow-scripts allow-same-origin"></iframe>
    </mblock>
  </mframe>`
}

/**
 * Process toolbar options into HTML content
 */
export type ToolbarInput = {
  key: string
  options: ObjectType<ToolbarOption>
  settings?: ToolbarSettings
  position?: {
    left: string
    top: string
  }
}
export const Toolbar = ( input: ToolbarInput ) => {
  const factory = ({ key, options, settings, position }: ToolbarInput ) => {
    if( typeof options !== 'object' )
      throw new Error('Invalid Toolbar Arguments')

    // Apply settings
    settings = {
      editing: false,
      detached: false,
      ...settings
    }

    let 
    mainOptions = '',
    extraOptions = '',
    subOptions: string[] = []

    const
    composeSubLi = ( parentAttr?: string ) => {
      return ([ attr, { icon, title, event, disabled, active }]: [ attr: string, tset: ToolbarOption ] ) => {
        let attrs = ''
        
        // Trigger event type & params attributes
        if( event ){
          if( event.type && attr ) attrs += ` ${event.type}="${parentAttr ? `${parentAttr}.` : ''}${attr}"`
          if( event.params ) attrs += ` params="${event.params}"`
        }

        // Add title attributes
        if( active ) attrs += ` active`
        if( disabled ) attrs += ` disabled`
        if( title ) attrs += ` title="${title}"`

        return `<mli ${attrs} title="${title}" ${CONTROL_LANG_SELECTOR}><micon class="${icon}"></micon></mli>`
      }
    },
    composeLi = ([ attr, { icon, label, title, event, disabled, active, extra, sub, meta }]: [ attr: string, tset: ToolbarOption ]) => {
      let attrs = ''
      
      // Option has sub options
      if( sub && Object.keys( sub ).length ){
        attrs += ` show="sub-toolbar" params="${attr}"`

        // Create a sub options
        subOptions.push(`<mblock options="sub" extends="${attr}">
                          <mli dismiss="sub-toolbar" title="Back" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-chevron-left"></micon></mli>
                          <mli class="label"><micon class="${icon}"></micon><mlabel ${CONTROL_LANG_SELECTOR}>${label || title}</mlabel></mli>
                          ${Object.entries( sub ).map( composeSubLi( attr ) ).join('')}
                        </mblock>`)
      }

      // Trigger event type & params attributes
      else if( event ){
        if( event.type && attr ) attrs += ` ${event.type}="${attr}"`
        if( event.params ) attrs += ` params="${event.params}"`
      }

      // Add title attributes
      if( meta ) attrs += ` meta`
      if( active ) attrs += ` active`
      if( disabled ) attrs += ` disabled`
      if( label ) attrs += ` class="label"`
      if( title ) attrs += ` title="${title}"`

      const optionLi = `<mli ${attrs} ${CONTROL_LANG_SELECTOR}><micon class="${icon}"></micon>${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}</mli>`
      extra ?
        extraOptions += optionLi
        : mainOptions += optionLi
    }
    
    /**
     * Attach meta options to every editable view.
     */
    const 
    metaOptions: ObjectType<ToolbarOption> = {},
    detachedOptions: ObjectType<ToolbarOption> = {},
    isVisible = ([ key, option ]: [string, ToolbarOption]) => (!option.hidden)

    Object
    .entries( VIEW_CONTROL_OPTIONS )
    .filter( isVisible )
    .map( ([attr, option]) => {
      if( option.meta ) metaOptions[ attr ] = option
      if( settings?.detached && option.detached ) detachedOptions[ attr ] = option
    } )

    if( settings.editing && Object.keys( metaOptions ).length )
      options = { ...options, ...metaOptions }

    // Generate HTML menu
    Object
    .entries( options )
    .filter( isVisible )
    .map( composeLi )

    if( !mainOptions )
      throw new Error('Undefined main options')

    let optionalAttrs = ''
    if( settings.editing ) 
      optionalAttrs += ' class="editing"'
    
    if( typeof position == 'object' )
      optionalAttrs += ` style="left:${position.left};top:${position.top};"`

    return `<mblock ${CONTROL_TOOLBAR_SELECTOR}="${key}" ${optionalAttrs}>
      <mblock container>
        <mul>
          <mblock options="main">
            ${mainOptions}
            ${extraOptions ? `<mli show="extra-toolbar" title="Extra options" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-dots-horizontal-rounded"></micon></mli>` : ''}
          </mblock>

          ${extraOptions ?
                `<mblock options="extra">
                  ${extraOptions}
                  <mli dismiss="extra-toolbar" title="Back" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-chevron-left"></micon></mli>
                </mblock>` : ''}

          ${subOptions.length ? subOptions.join('') : ''}
        </mul>

        ${Object.keys( detachedOptions ).length ? 
              `<mul>
                <mblock options="control">
                  ${Object.entries( detachedOptions ).map( composeSubLi() ).join('')}
                </mblock>
              </mul>`: ''}
      </mblock>
    </mblock>`
  }

  return new Component<ToolbarInput>( factory( input ), { input })
}

export type PanelInput = {
  key: string
  caption: ViewCaption
  options: PanelSections
  position?: {
    left: string
    top: string
  }
  active?: string 
}
export const Panel = ( input: PanelInput ) => {
  const factory = ({ key, caption, options, position, active }: PanelInput ) => {
    if( typeof options !== 'object' )
      throw new Error('Invalid createPanel options')

    let
    sectionTabs = '',
    sectionBodies = ''

    const composeSection = ( name: string, { icon, title, fieldsets, listsets }: PanelSection, isActive: boolean ) => {
      /**
       * List of tabs
       */
      sectionTabs += `<mli tab="${name}" ${isActive ? 'class="active"' : ''} ${title ? `title="${title}" ${CONTROL_LANG_SELECTOR}` : ''}><micon class="${icon}"></micon></mli>`

      let fieldsetHTML = ''
      fieldsets?.map( ({ label, fields, seperate }) => {
        // Do not render empty fieldset
        if( !Array.isArray( fields ) || !fields.length )
          return
        
        fieldsetHTML += `<fieldset>
          ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}
          ${fields.map( each => (createInput( each )) ).join('')}
        </fieldset>`

        // Add seperator to this block
        if( seperate )
          fieldsetHTML += createFormSeperator()
      } )

      let listsetHTML = ''
      listsets?.map( ({ label, items, seperate }) => {
        // Do not render empty list
        if( !Array.isArray( items ) || !items.length )
          return
        
        listsetHTML += `<mblock class="listset">
          ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label}</mlabel>` : ''}
          <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
        </mblock>`

        // Add seperator to this block
        if( seperate )
          listsetHTML += createFormSeperator()
      } )

      sectionBodies += `<mblock section="attributes" class="active">
        <mblock>${fieldsetHTML}</mblock>
        <mblock>${listsetHTML}</mblock>
      </mblock>`
    }

    /**
     * Generate HTML content of panel sections
     */
    Object.entries( options ).map( ( [name, section], index ) => composeSection( name, section, active == name || index === 0) )

    let optionalAttrs = ''
    if( typeof position == 'object' ) 
      optionalAttrs += ` style="left:${position.left};top:${position.top};"`

    return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}" ${optionalAttrs}>
      <mblock dismiss="panel" backdrop></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <micon class="${caption.icon}"></micon>
            <mlabel ${CONTROL_LANG_SELECTOR}>${caption.title}</mlabel>

            <!-- Dismiss control panel -->
            <span dismiss="panel" title="Dismiss" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-x"></micon></span>
          </mblock>

          <mul options="tabs">${sectionTabs}</mul>
        </mblock>

        <mblock class="body">${sectionBodies}</mblock>
      </mblock>
    </mblock>`
  }

  return new Component<PanelInput>( factory( input ), { input })
}

export type FloatingInput = {
  key: string
  type: 'view' | 'layout'
  triggers: string[]
}
export const Floating = ( input: FloatingInput ) => {
  const factory = ({ key, type, triggers }: FloatingInput ) => {
    if( !Array.isArray( triggers ) || !triggers.length )
      throw new Error('Undefined triggers list')

    let list = ''
    triggers.map( each => {
      switch( each ){
        case 'addpoint': list += `<mli show="finder" params="${type}" title="Add view" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-plus"></micon></mli>`; break
        case 'paste': list += `<mli action="paste" params="${type}" title="Paste view" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-paste"></micon></mli>`; break
      }
    } )

    return `<mblock ${CONTROL_FLOATING_SELECTOR}="${key}"><mul>${list}</mul></mblock>`
  }

  return new Component( factory( input ), { input })
}

/**
 * Create common alley block
 */
export type AlleyInput = {
  key?: string
  discret?: boolean
}
export const Alley = ( input: AlleyInput = {} ) => {
  const factory = ({ key, discret }: AlleyInput ) => {
    return `<mblock ${VIEW_ALLEY_SELECTOR}="${generateKey()}" ${VIEW_REF_SELECTOR}="${key}" status="active" ${discret ? 'discret' : ''}></mblock>`
  }

  return new Component<AlleyInput>( factory( input ), { input })
}

export const createInput = ({ type, label, name, value, pattern, placeholder, autofocus, options, range, disabled }: InputOptions ) => {

  const id = `input-${type}-${(label || name).toLowerCase().replace(/\s+/, '-')}`

  switch( type ){
    case 'text':
    case 'search': {
      return `<mblock ${FORM_INPUT_SELECTOR}="${type}">
        <!--<mlabel for="${id}">${label}</mlabel>-->
        <input ${CONTROL_LANG_SELECTOR}
                id="${id}"
                type="${type}"
                name="${name}"
                ${label ? `title="${label}"`: ''}
                ${value ? `value="${value}"`: ''}
                ${disabled ? `disabled="true"`: ''}
                ${pattern ? `pattern="${pattern}"`: ''}
                ${autofocus ? `autofocus="${autofocus}"`: ''}
                ${placeholder || label ? `placeholder="${placeholder || label}"`: ''}>
      </mblock>`
    }

    case 'checkbox': {
      return `<mblock ${FORM_INPUT_SELECTOR}="${type}">
        <input id="${id}"
                type="${type}"
                name="${name}"
                ${disabled ? `disabled="true"`: ''}
                ${value ? `checked="true"`: ''}>
        <label for="${id}" ${CONTROL_LANG_SELECTOR}>${label}</label>
      </mblock>`
    }
  }
}

export const createSelectFileInput = ({ id, accepts, multiple }: SelectFileOptions ) => {
  return `<mblock ${FORM_INPUT_SELECTOR}="upload" style="display:none!important">
    <input id="${id}"
            type="file"
            multiple="${!!multiple}"
            accept="${accepts || '*'}">
  </mblock>`
}

export const createFormSeperator = ( options?: SeperatorOptions ) => {
  return `<mblock ${FORM_SEPERATOR_SELECTOR}></mblock>`
}

export const createListItem = ({ icon, title, value, event, sub, disabled }: ListItem ) => {
  let attrs = `${disabled ? 'class="disabled"' : ''}`
  
  // Trigger event type & params attributes
  if( event ){
    if( event.type && event.attr ) attrs += ` ${event.type}="${event.attr}"`
    if( event.params ) attrs += ` params="${event.params}"`
  }

  return `<mli ${attrs}>
    <micon class="${icon}"></micon>
    <minline ${CONTROL_LANG_SELECTOR}>${title}</minline>
    ${value ? `<minline class="value" ${CONTROL_LANG_SELECTOR}>${value}</minline>` : ''}

    ${sub ? `<minline class="sub-arrow"><micon class="bx bx-chevron-right"></micon></minline>` : ''}
  </mli>`
}

export type SearchResultInput = {
  list: ObjectType<Listset>
}
export const SearchResult = ( input: SearchResultInput ) => {
  const factory = ({ list }: SearchResultInput ) => {
    let listsetHTML = ''
    
    /**
     * Generate HTML content of panel sections
     */
    Object.values( list ).map( ({ label, items, seperate }: Listset, index: number ) => {
      // Do not render empty list
      if( !Array.isArray( items ) || !items.length )
        return

      // Insert seperator between group blocks
      if( seperate && index > 0 )
        listsetHTML += createFormSeperator()
      
      listsetHTML += `<mblock class="listset">
        ${label ? `<mlabel ${CONTROL_LANG_SELECTOR}>${label.replace(/-/g, ' ').toCapitalCase()}</mlabel>` : ''}
        <mul>${items.map( each => (createListItem( each )) ).join('')}</mul>
      </mblock>`
    } )

    return listsetHTML || `<mblock ${VIEW_EMPTY_SELECTOR} ${CONTROL_LANG_SELECTOR}>No result</mblock>`
  }

  return new Component<SearchResultInput>( factory( input ), { input })
}

export type FinderPanelInput = {
  key: string
  list: ObjectType<Listset> 
}
export const FinderPanel = ( input: FinderPanelInput ) => {
  const factory  = ({ key, list }: FinderPanelInput ) => {
    if( !key || !list )
      throw new Error('Invalid createAddViewBlock options')

    return `<mblock ${CONTROL_PANEL_SELECTOR}="${key}">
      <mblock dismiss="panel" backdrop></mblock>
      <mblock container>
        <mblock class="header">
          <mblock>
            <minline ${CONTROL_LANG_SELECTOR}>Add view</minline>

            <!-- Dismiss control panel -->
            <minline dismiss="panel" title="Dismiss" ${CONTROL_LANG_SELECTOR}><micon class="bx bx-x"></micon></minline>
          </mblock>

          ${createInput({
            type: 'search',
            name: 'search',
            placeholder: 'Search view'
          })}
        </mblock>

        <mblock class="results">
          ${SearchResult({ list }).template}
        </mblock>
      </mblock>
    </mblock>`
  }

  return new Component<FinderPanelInput>( factory( input ), { input })
}