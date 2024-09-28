import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface Question {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

interface LocationState {
  score: number;
  totalQuestions: number;
  selectedAnswers: (string | null)[];
  questions: Question[];
}

const ResultsPage: React.FC = () => {
  const { state } = useLocation();
  const { score, totalQuestions, selectedAnswers, questions } =
    state as LocationState;
  const percentage = (score / totalQuestions) * 100;
  const navigate = useNavigate();

  const restartQuiz = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 py-16">
      <h1 className="text-4xl font-bold mb-8 text-orange-600">Quiz Results</h1>

      {/* Circular Chart for Score */}
      <div className="w-32 h-32 mb-6">
        <CircularProgressbar
          value={percentage}
          text={`${Math.round(percentage)}%`}
          styles={buildStyles({
            textColor:
              percentage <= 50
                ? "red"
                : percentage > 50 && percentage <= 70
                ? "orange"
                : percentage > 70 && percentage <= 90
                ? "gray"
                : "green",
            pathColor:
              percentage <= 50
                ? "red"
                : percentage > 50 && percentage <= 70
                ? "orange"
                : percentage > 70 && percentage <= 90
                ? "gray"
                : "green", 
            trailColor: "#d6d6d6",
          })}
        />
      </div>

      <div className="bg-white shadow-md p-6 rounded-lg w-full max-w-md text-center">
        <p className="text-2xl mb-4">
          You scored{" "}
          <span
            className={`${
              percentage <= 50
                ? "text-red-600"
                : percentage > 50 && percentage <= 70
                ? "text-orange-600"
                : percentage > 70 && percentage <= 90
                ? "text-gray-600"
                : "text-green-600"
            }`}
          >
            {score}
          </span>{" "}
          out of <span className="text-orange-500">{totalQuestions}</span>
        </p>

        {/* Show wrong answers */}
        <div className="text-left mt-8">
          <h2 className="text-xl font-bold mb-4 text-orange-600">
            Review Incorrect Answers
          </h2>
          <div className="space-y-6">
            {questions.map((question, index) => {
              const selectedAnswer = selectedAnswers[index];
              const isCorrect = selectedAnswer === question.correct_answer;
              if (isCorrect) return null; // Only show wrong answers

              return (
                <div
                  key={index}
                  className="p-4 border border-red-400 rounded-lg bg-red-50"
                >
                  <p
                    className="mb-2 font-semibold"
                    dangerouslySetInnerHTML={{ __html: question.question }}
                  />
                  <p className="text-red-600">
                    Your Answer:{" "}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: selectedAnswer || "No answer selected",
                      }}
                    />
                  </p>
                  <p className="text-green-600">
                    Correct Answer:{" "}
                    <span
                      dangerouslySetInnerHTML={{
                        __html: question.correct_answer,
                      }}
                    />
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={restartQuiz}
            className="py-2 px-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;
