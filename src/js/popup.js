document.addEventListener('DOMContentLoaded', () => {
  const analyzeBtn = document.getElementById('analyzeBtn');
  const nextBtn = document.getElementById('nextBtn');
  const prevBtn = document.getElementById('prevBtn');
  const loading = document.getElementById('loading');
  const questionText = document.getElementById('questionText');
  const optionsList = document.getElementById('optionsList');
  const answerSection = document.getElementById('answerSection');
  const answerText = document.getElementById('answerText');
  const questionCounter = document.getElementById('questionCounter');
  
  let questions = [];
  let currentQuestionIndex = 0;
  let selectedOption = null;
  
  // Function to get API key from storage
  async function getApiKey() {
    const result = await chrome.storage.sync.get(['geminiApiKey']);
    return result.geminiApiKey;
  }
  
  // Function to extract all questions from the page
  async function extractQuestions() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    // Send message to content script to extract all questions
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractQuestion' });
    
    if (response.success) {
      questions = response.questions;
      currentQuestionIndex = 0;
      updateQuestionDisplay();
    } else {
      throw new Error(response.error || 'Failed to extract questions');
    }
  }
  
  // Function to update the question display
  function updateQuestionDisplay() {
    if (questions.length === 0) {
      questionText.textContent = 'No questions found';
      optionsList.innerHTML = '';
      return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    questionText.textContent = currentQuestion.text;
    questionCounter.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    
    // Clear and populate options
    optionsList.innerHTML = '';
    currentQuestion.options.forEach((option, index) => {
      const li = document.createElement('li');
      li.className = 'option-item';
      li.textContent = option;
      li.addEventListener('click', () => selectOption(index));
      optionsList.appendChild(li);
    });
    
    // Reset UI state
    answerSection.classList.remove('visible');
    nextBtn.disabled = false;
    prevBtn.disabled = currentQuestionIndex === 0;
    analyzeBtn.disabled = false;
  }
  
  // Function to select an option
  function selectOption(index) {
    // Remove previous selection
    const previousSelected = optionsList.querySelector('.selected');
    if (previousSelected) {
      previousSelected.classList.remove('selected');
    }
    
    // Add new selection
    optionsList.children[index].classList.add('selected');
    selectedOption = index;
  }
  
  // Function to analyze question using Gemini
  async function analyzeQuestion() {
    try {
      loading.classList.add('active');
      analyzeBtn.disabled = true;
      
      const apiKey = await getApiKey();
      if (!apiKey) {
        throw new Error('Please set your Gemini API key in the extension options');
      }
      
      const currentQuestion = questions[currentQuestionIndex];
      
      // Prepare the prompt for Gemini
      const prompt = `Question: ${currentQuestion.text}\n\nOptions:\n${currentQuestion.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n')}\n\nPlease analyze this question and provide:\n1. The correct answer\n2. A detailed explanation of why this is the correct answer, including:\n   - Key concepts involved\n   - Step-by-step reasoning\n   - Why other options are incorrect\n3. Your confidence level (0-100%)\n4. Any additional insights or related concepts that would help understand the topic better`;
      
      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      // Parse Gemini's response
      const analysis = data.candidates[0].content.parts[0].text;
      
      // Display the analysis
      answerText.textContent = analysis;
      answerSection.classList.add('visible');
      
    } catch (error) {
      console.error('Error analyzing question:', error);
      answerText.textContent = `Error: ${error.message}`;
      answerSection.classList.add('visible');
    } finally {
      loading.classList.remove('active');
      analyzeBtn.disabled = false;
    }
  }
  
  // Function to navigate to next question
  async function nextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      currentQuestionIndex++;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractQuestion',
        questionIndex: currentQuestionIndex
      });
      updateQuestionDisplay();
    }
  }
  
  // Function to navigate to previous question
  async function prevQuestion() {
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      await chrome.tabs.sendMessage(tab.id, { 
        action: 'extractQuestion',
        questionIndex: currentQuestionIndex
      });
      updateQuestionDisplay();
    }
  }
  
  // Event listeners
  analyzeBtn.addEventListener('click', analyzeQuestion);
  nextBtn.addEventListener('click', nextQuestion);
  prevBtn.addEventListener('click', prevQuestion);
  
  // Initial question extraction
  extractQuestions();
}); 