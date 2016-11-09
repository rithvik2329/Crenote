// https://developer.mozilla.org/fr/docs/Web/JavaScript/Reference/Classes
class Document {

  // Add a document and the corresponding content (empty or not).
  // Options :
  // - strPath (optional)
  // - strContent (optional)
  // - strDocThemeSlug (optional)
  // - strDocThemeName (optional)
  // - boolLockedDoc (optional)
  constructor(Options) {
    const ThisDoc = this;

    N.intDocIDsCount++;
    ThisDoc.intID = N.intDocIDsCount;

    ThisDoc.$Tab = N.$TabModel.cloneNode(true);
    ThisDoc.$ContentContainer = N.$ContentContainerModel.cloneNode(true);
    ThisDoc.$ContentEditable = ThisDoc.$ContentContainer.getElementsByClassName('wysiwyg-content')[0];
    ThisDoc.$FileName = ThisDoc.$Tab.getElementsByClassName('file-name')[0];

    ThisDoc.boolLocked = false;

    if (Options) {
      ThisDoc.methSetTabData(Options);

      ThisDoc.$ContentEditable.innerHTML = N.Functions.Content.funcPurifyHTML({
        strHTML: Options.strContent,
        strAllowedContentMode: 'document'
      });
      N.Functions.Content.funcClearHTML({ Document: ThisDoc });
      N.Functions.Content.funcDisplayEmojis({ Document: ThisDoc });

      if (Options.boolLockedDoc) {
        ThisDoc.boolLocked = true;
      }
    } else {
      ThisDoc.$FileName.textContent += N.intDocIDsCount + 1;
    }

    ThisDoc.$Tab.removeAttribute('id');
    ThisDoc.$Tab.dataset.id = ThisDoc.intID;

    ThisDoc.$ContentContainer.removeAttribute('id');

    ThisDoc.LastSelection;

    ThisDoc.strLastSavedContent = ThisDoc.$ContentEditable.innerHTML;



    ThisDoc.$Tab.getElementsByClassName('close-tab')[0].addEventListener('click', (Event) => {
      ThisDoc.methClose();

      // To avoid triggering ThisDoc.methShow() because the button is a child of the tab.
      Event.stopPropagation();
    });


    ThisDoc.$Tab.getElementsByClassName('close-tab-cancel')[0].addEventListener('click', (Event) => {
      ThisDoc.$Tab.classList.remove('close-confirm');

      // To avoid triggering ThisDoc.methShow() because the button is a child of the tab.
      Event.stopPropagation();
    });
    ThisDoc.$Tab.getElementsByClassName('close-tab-confirm')[0].addEventListener('click', (Event) => {
      ThisDoc.methClose({ boolForceAction: true });

      // To avoid triggering ThisDoc.methShow() because the button is a child of the tab.
      Event.stopPropagation();
    });


    ThisDoc.$Tab.addEventListener('click', (Event) => {
      if (Event.button === 0) {
        ThisDoc.methShow();
      }
      else if (Event.button === 1) {
        ThisDoc.methClose();

        // FIXME [(Un)colored] : On Windows, cancel the default middle mouse click page navigation system. Event.preventDefault() not working.
      }
    });


    // To avoid triggering the 'dblclick' of N.$TabsList.
    ThisDoc.$Tab.addEventListener('dblclick', (Event) => {
      Event.stopPropagation();
    });


    ThisDoc.$ContentContainer.addEventListener('scroll', () => {
      N.Functions.Toolbar.funcAutoPosition();
    });



    ThisDoc.Editor = wysiwyg({
      element: ThisDoc.$ContentEditable
    });

    ThisDoc.$ContentEditable.addEventListener('click', () => {
      ThisDoc.LastSelection = lightrange.saveSelection();
      N.Functions.Toolbar.funcView();
      N.Functions.Toolbar.funcAutoPosition();
      N.Functions.Toolbar.funcCheckTools();
      // Because of the context menu on a tab
      N.$Header.classList.remove('active');
    });

    ThisDoc.$ContentEditable.addEventListener('keydown', (Event) => {
      ThisDoc.LastSelection = lightrange.saveSelection();
      N.Functions.Toolbar.funcView();
      N.Functions.Toolbar.funcAutoPosition();
      N.Functions.Toolbar.funcCheckTools();

      // Space key
      if (Event.keyCode === 32) {
        N.Functions.Content.funcDisplayEmojis({ Document: ThisDoc });
      }
      else if (Event.altKey) {
        N.$Toolbar.classList.add('active');
      }

      ThisDoc.methMenuCheck();
    });

    ThisDoc.$ContentEditable.addEventListener('input', () => {

      if ( ! ThisDoc.$ContentEditable.innerHTML) {
        ThisDoc.$ContentEditable.innerHTML = '<p><br></p>';
      }

      if (ThisDoc.$ContentEditable.innerHTML === ThisDoc.strLastSavedContent) {
        N.$GlobalUnsavedMark.classList.remove('active');
        ThisDoc.$Tab.classList.remove('doc-unsaved');
      } else {
        N.$GlobalUnsavedMark.classList.add('active');
        ThisDoc.$Tab.classList.add('doc-unsaved');
      }

      // keydown is not triggered with some command like 'undo', so we have to check here as well
      ThisDoc.methMenuCheck();
    });

    ThisDoc.$ContentEditable.addEventListener('copy', () => {
      clearTimeout(N.timerCopy);
      N.timerCopy = setTimeout(() => {
        N.strLastHTMLCopied = N.ElectronFramework.Clipboard.readHTML();
        clearTimeout(N.timerCopy);
      }, 50);
    });
    ThisDoc.$ContentEditable.addEventListener('cut', () => {
      clearTimeout(N.timerCopy);
      N.timerCopy = setTimeout(() => {
        N.strLastHTMLCopied = N.ElectronFramework.Clipboard.readHTML();
        clearTimeout(N.timerCopy);
      }, 50);
    });

    ThisDoc.$ContentEditable.addEventListener('paste', () => {
      let strClipboardHTML = N.ElectronFramework.Clipboard.readHTML();

      if (strClipboardHTML !== N.strLastHTMLCopied && strClipboardHTML !== N.strLastHTMLPasted) {
        strClipboardHTML = N.Functions.Content.funcPurifyHTML({
          strHTML: strClipboardHTML,
          strAllowedContentMode: 'paste'
        });

        N.ElectronFramework.Clipboard.writeHTML(strClipboardHTML);
        N.strLastHTMLPasted = strClipboardHTML;
      }
      // Set capture mode to "true" to execute paste instructions before the content is actually pasted.
      // http://stackoverflow.com/questions/7398290/unable-to-understand-usecapture-attribute-in-addeventlistener/7398447#7398447
    }, true);


    ThisDoc.$ContentEditable.addEventListener('paste', () => {
      clearTimeout(N.timerPaste);
      N.timerPaste = setTimeout(() => {
        N.Functions.Content.funcClearHTML({ Document: ThisDoc });
        N.Functions.Content.funcDisplayEmojis({ Document: ThisDoc });
        clearTimeout(N.timerPaste);
      }, 100);
    });


    ThisDoc.$ContentEditable.addEventListener('dragstart', (Event) => {
      N.strLastHTMLDragged = Event.target;
    });

    ThisDoc.$ContentEditable.addEventListener('drag', (Event) => {
      if (Event.target === N.strLastHTMLDragged) {
        N.boolCanDrop = true;
      } else {
        Event.preventDefault();
        return false;
      }
    });

    ThisDoc.$ContentEditable.addEventListener('dragover', (Event) => {
      if ( ! N.boolCanDrop) {
        Event.preventDefault();
        return false;
      }
    });

    ThisDoc.$ContentEditable.addEventListener('drop', (Event) => {
      if ( ! N.boolCanDrop) {
        Event.preventDefault();
        return false;
      }
      // N.boolCanDrop always "false" by default
      N.boolCanDrop = false;
    });


    N.$TabsList.appendChild(ThisDoc.$Tab);
    N.$Workspace.appendChild(ThisDoc.$ContentContainer);

    N.arrDocs.push(ThisDoc);
    N.intCurrentDocs++;

    ThisDoc.methShow();
    N.Functions.Toolbar.funcResetPosition();

    N.$TabsList.scrollLeft = N.$TabsList.scrollWidth;
  }


  methSetTabData(Parameter) {
    const ThisDoc = this;

    ThisDoc.FilePathInfo = N.Functions.Utils.funcGetFilePathInfo({ strPath: Parameter.strPath });

    ThisDoc.strPath = Parameter.strPath;
    ThisDoc.strFormat = ThisDoc.FilePathInfo.strFormat;

    if (Parameter.strDocThemeSlug) {
      ThisDoc.strDocThemeSlug = Parameter.strDocThemeSlug;
      ThisDoc.strDocThemeName = Parameter.strDocThemeName;
    }

    ThisDoc.$FileName.textContent = ThisDoc.FilePathInfo.strName;
    ThisDoc.$Tab.classList.add('opened-doc');
  }


  methShow() {
    const ThisDoc = this;

    ThisDoc.methMenuCheck();

    N.Functions.Dialogs.funcCloseContext();
    N.Functions.Documents.funcDocActiveChange();

    if (ThisDoc.$Tab.classList.contains('doc-unsaved')) {
      N.$GlobalUnsavedMark.classList.add('active');
    } else {
      N.$GlobalUnsavedMark.classList.remove('active');
    }

    ThisDoc.$Tab.classList.add('active');
    ThisDoc.$ContentContainer.classList.add('active');

    if (ThisDoc.LastSelection) {
      lightrange.restoreSelection(ThisDoc.LastSelection);
    } else {
      ThisDoc.$ContentEditable.focus();
    }
    N.Functions.Toolbar.funcView();

    ThisDoc.methSetInfoDialog();

    N.DocActive = ThisDoc;
  }


  methMenuCheck() {
    const ThisDoc = this;

    if (ThisDoc.strPath) {
      N.$MenuOpenDocFolder.classList.remove('disabled');

      if (ThisDoc.$Tab.classList.contains('doc-unsaved')) {
        N.$MenuSave.classList.remove('disabled');
      } else {
        N.$MenuSave.classList.add('disabled');
      }
    } else {
      N.$MenuOpenDocFolder.classList.add('disabled');
      N.$MenuSave.classList.add('disabled');
    }

    if (ThisDoc.boolLocked) {
      N.$MenuSave.classList.add('disabled');
    }
  }


  // Option :
  // - boolForceAction (optional)
  methClose(Option) {
    const ThisDoc = this;

    // if boolForceAction : close the tab without warning.
    if (Option && Option.boolForceAction) {

      N.arrDocs[ThisDoc.intID] = undefined;
      N.intCurrentDocs--;

      if (ThisDoc === N.DocActive) {
        const $PreviousTab = ThisDoc.$Tab.previousElementSibling;
        if ($PreviousTab) {
          $PreviousTab.click();
        } else {
          const $NextTab = ThisDoc.$Tab.nextElementSibling;
          if ($NextTab) {
            $NextTab.click();
          }
        }
      }

      ThisDoc.$Tab.parentNode.removeChild(ThisDoc.$Tab);
      ThisDoc.$ContentContainer.parentNode.removeChild(ThisDoc.$ContentContainer);

      // There is always at least 1 tab opened.
      if ( ! N.intCurrentDocs) {
        new Document();
      }

    } else {

      if (ThisDoc.$Tab.classList.contains('doc-unsaved')) {
        ThisDoc.$Tab.classList.add('close-confirm');
      } else {
        ThisDoc.methClose({ boolForceAction: true });
      }

    }

  }


  methOpenFolder() {
    const ThisDoc = this;

    if (ThisDoc.strPath) {
      N.ElectronFramework.Shell.showItemInFolder(ThisDoc.strPath);
    }
  }


  methSetInfoDialog() {
    const ThisDoc = this;

    if (ThisDoc.strDocThemeName) {
      N.$DocInfoThemeName.textContent = ThisDoc.strDocThemeName;
    } else {
      N.$DocInfoThemeName.textContent = '—';
    }

    Countable.once(ThisDoc.$ContentEditable, (Counter) => {
      N.$DocInfoParagraphs.textContent = Counter.paragraphs;
      N.$DocInfoSentences.textContent = Counter.sentences;
      N.$DocInfoWords.textContent = Counter.words;
      N.$DocInfoCharacters.textContent = Counter.characters;
      N.$DocInfoCharactersSpaces.textContent = Counter.all;
    });
  }

}
