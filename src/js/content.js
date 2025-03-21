// Function to find all question elements on the page
function findAllQuestions() {
  const questions = [];
  
  // Common question container selectors
  const selectors = [
    '.question-container',
    '.quiz-question',
    '.question-box',
    '.question-text',
    '[data-testid="question"]',
    '.question',
    '#question',
    '.question-content'
  ];
  
  // Try to find all question containers
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach((element, index) => {
        const options = findAnswerOptions(element);
        if (options.length >= 2) {
          questions.push({
            id: index,
            container: element,
            text: element.textContent.trim(),
            options: options,
            position: element.getBoundingClientRect()
          });
        }
      });
    }
  }
  
  // If no specific containers found, try to find question text
  if (questions.length === 0) {
    const textElements = document.querySelectorAll('p, div, span');
    textElements.forEach((element, index) => {
      const text = element.textContent.trim();
      if (text.length > 10 && text.includes('?') && !text.includes('http')) {
        const options = findAnswerOptions(element);
        if (options.length >= 2) {
          questions.push({
            id: index,
            container: element,
            text: text,
            options: options,
            position: element.getBoundingClientRect()
          });
        }
      }
    });
  }
  
  return questions;
}

// Function to find answer options
function findAnswerOptions(questionContainer) {
  const options = [];
  
  // Handle true/false questions
  if (questionContainer.classList.contains('true_false_question')) {
    const trueFalseOptions = questionContainer.querySelectorAll('.select_answer .answer_text');
    trueFalseOptions.forEach(element => {
      const text = element.textContent.trim();
      if (text && !options.includes(text)) {
        options.push(text);
      }
    });
    if (options.length >= 2) {
      return options;
    }
  }
  
  // Handle multiple choice questions
  const optionSelectors = [
    '.answer .answer_text',  // More specific selector for answer text
    '.select_answer .answer_text',
    '.answer_text'
  ];
  
  // Try to find options within the question container
  for (const selector of optionSelectors) {
    const elements = questionContainer.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && !options.includes(text)) {
          options.push(text);
        }
      });
      if (options.length >= 2) {
        return options;
      }
    }
  }
  
  // If no options found in container, try to find them in the document
  for (const selector of optionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      elements.forEach(element => {
        const text = element.textContent.trim();
        if (text && !options.includes(text)) {
          options.push(text);
        }
      });
      if (options.length >= 2) {
        return options;
      }
    }
  }
  
  return options;
}

// Function to scroll to element
function scrollToElement(element) {
  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractQuestion') {
    try {
      const questions = findAllQuestions();
      
      if (questions.length === 0) {
        sendResponse({
          success: false,
          error: 'No questions found on the page'
        });
        return true;
      }
      
      // If a specific question index is requested
      if (request.questionIndex !== undefined) {
        const question = questions[request.questionIndex];
        if (question) {
          scrollToElement(question.container);
          sendResponse({
            success: true,
            question: {
              text: question.text,
              options: question.options,
              position: question.position
            },
            totalQuestions: questions.length,
            currentIndex: request.questionIndex
          });
        } else {
          sendResponse({
            success: false,
            error: 'Question not found'
          });
        }
      } else {
        // Return all questions
        sendResponse({
          success: true,
          questions: questions.map(q => ({
            text: q.text,
            options: q.options,
            position: q.position
          })),
          totalQuestions: questions.length
        });
      }
      
    } catch (error) {
      sendResponse({
        success: false,
        error: error.message
      });
    }
    
    return true;
  }
}); 