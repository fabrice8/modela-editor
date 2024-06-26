
export default {
  name: 'card',
  node: 'div.card',
  category: 'block',
  caption: {
    icon: 'bx bx-card',
    title: 'Card',
    description: 'HTML Card component with header, body and footer.'
  },
  attributes: {
    header: true
  },

  render({ i18n, fn }){
    const
    headerProps = {
      selector: '.card-header',
      /**
       * Define the caption of header to help 
       * users know how it should be used.
       */
      caption: {
        title: i18n.translate('Card Header').text,
        description: i18n.translate('Usually contain the title of the body content').text,
        posters: [
          { type: 'image', src: '...', info: i18n.translate('Example of header with a title and subtitle').text }
        ]
      },
      /**
       * Tells whether to add new views to this
       * block.
       */
      addView: true,
      /**
       * Define an option list of view content types that
       * could be added to this block.
       * 
       * Default: any (if `addView` param is set to true)
       */
      allowedViewTypes: ['inline', 'icon']
    },
    bodyProps = {
      selector: '.card-body',
      caption: {
        title: 'Card Body',
        description: 'Contain the main body content',
        posters: [
          { type: 'image', src: '...', info: 'Example of text body content' }
        ],
      },
      addView: true
    },
    footerProps = {
      selector: '.card-footer',
      caption: {
        title: 'Card Header',
        description: 'Usually contain the actions or additional details about the body content',
        posters: [
          { type: 'image', src: '...', info: 'Illustration of action footer style' }
        ]
      },
      addView: true,
      allowedViewTypes: ['inline', 'icon', 'button']
    },
    cardProps = {
      caption: {
        title: 'Card',
        description: 'Insert card component into your UI',
        posters: [
          { type: 'image', src: '...', info: 'Plain card design illustration' }
        ]
      }
    },

    header = `<div class="card-header">${fn.defineProperties( headerProps )} Card header</div>`,
    footer = `<div class="card-footer">${fn.defineProperties( footerProps )} Card footer</div>`

    return `<div class="card">
      ${fn.defineProperties( cardProps )}

      <div class="card-content">
        ${this.attributes.header ? header : ''}
        <div class="card-body">${fn.defineProperties( bodyProps )} Card body</div>
        ${this.attributes.footer ? footer : ''}
      </div>
    </div>`
  },
  takeover( view ){},
  dismiss( view ){},

  styles( view ){
    
    return {
      css: `
        min-height: 10rem;
        background-color: var(--ambiant-color);

        .card-header {
          background-color: var(--primary-color);
        }
        .card-body {
          background-color: var(--secondary-color);
        }
      `
    }
  },
  
  translation: {
    en: {
      'Card Header': 'Card Header',
      'Usually contain the title of the body content': 'Usually contain the title of the body content',
      'Example of header with a title and subtitle': 'Example of header with a title and subtitle'
    },
    fr: {
      'Card Header': 'Entête de carte',
      'Usually contain the title of the body content': 'Contient souvent le title du contenu principal',
      'Example of header with a title and subtitle': 'Exemple d\'entête avec un titre et un sous-title'
    }
  }
}