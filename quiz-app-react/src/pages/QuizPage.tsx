import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface LocationState {
  apiUrl: string;
}

const QuizPage: React.FC = () => {
  const { state } = useLocation();
  const { apiUrl } = state as LocationState;
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(string | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFinished, setHasFinished] = useState<boolean>(false);
  const [shuffledAnswers, setShuffledAnswers] = useState<string[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await axios.get(apiUrl);
        setQuestions(response.data.results);
        setSelectedAnswers(new Array(response.data.results.length).fill(null));
        setLoading(false);
      } catch (error) {
        setError("Failed to load questions. Please try again.");
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [apiUrl]);

  // Update shuffled answers when current question changes
  useEffect(() => {
    if (questions.length > 0) {
      const currentQuestion = questions[currentQuestionIndex];
      const shuffled = [
        ...currentQuestion.incorrect_answers,
        currentQuestion.correct_answer,
      ].sort(() => Math.random() - 0.5);
      setShuffledAnswers(shuffled);
    }
  }, [currentQuestionIndex, questions]);

  const handleAnswerSelect = (answer: string) => {
    const updatedAnswers = [...selectedAnswers];
    updatedAnswers[currentQuestionIndex] = answer;
    setSelectedAnswers(updatedAnswers);
    if (selectedAnswers.length === questions.length) setHasFinished(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const submitQuiz = () => {
    const score = selectedAnswers.reduce((total, answer, index) => {
      if (answer === questions[index].correct_answer) {
        return total + 1;
      }
      return total;
    }, 0);

    navigate("/results", {
      state: { score, totalQuestions: questions.length, questions, selectedAnswers },
    });
  };

  if (loading) {
    return (
      <p className="min-h-screen flex items-center justify-center text-center text-lg text-orange-600">
        Loading questions...
      </p>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600">{error}</p>
        <button
          className="mt-4 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-600">
          Sorry, we couldn't find questions. Please try again.
        </p>
        <button
          className="mt-4 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          onClick={() => navigate("/")}
        >
          Retry
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-12">
      <h1 className="text-3xl font-bold mb-4 text-orange-600">
        Question {currentQuestionIndex + 1} / {questions.length}
      </h1>

      <div className="bg-white shadow-md p-6 rounded-lg w-full max-w-lg">
        <h2
          className="text-xl mb-4"
          dangerouslySetInnerHTML={{ __html: currentQuestion.question }}
        />

        <div className="space-y-4">
          {shuffledAnswers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswerSelect(answer)}
              dangerouslySetInnerHTML={{ __html: answer }}
              className={`block w-full py-2 px-4 border border-gray-300 rounded-lg text-left transition-colors ${
                selectedAnswers[currentQuestionIndex] === answer
                  ? "bg-orange-500 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between mt-6">
          <button
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
            className="py-2 px-4 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          {currentQuestionIndex === questions.length - 1 ? (
            <button
              onClick={submitQuiz}
              disabled={!hasFinished}
              className="py-2 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Quiz
            </button>
          ) : (
            <button
              onClick={handleNextQuestion}
              className="py-2 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
