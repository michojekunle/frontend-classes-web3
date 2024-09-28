import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { categories } from "../lib";

const HomePage: React.FC = () => {
  const [numberOfQuestions, setNumberOfQuestions] = useState<number>(10);
  const [category, setCategory] = useState<string>("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [error, setError] = useState<string>("");
  const navigate = useNavigate();

  const startQuiz = () => {
    if (numberOfQuestions <= 0) {
      setError("Please enter a valid number of questions.");
      return;
    }

    let apiUrl = `https://opentdb.com/api.php?amount=${numberOfQuestions}`;
    if (category) apiUrl += `&category=${category}`;
    if (difficulty) apiUrl += `&difficulty=${difficulty}`;
    if (type) apiUrl += `&type=${type}`;

    navigate("/quiz", { state: { apiUrl } });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-orange-100 px-6">
      <h1 className="text-4xl font-bold mb-8 text-orange-600">
        React Trivia Quiz
      </h1>

      {error && (
        <div className="bg-red-100 text-red-600 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col">
          <label className="text-lg mb-2">Number of Questions:</label>
          <input
            type="number"
            value={numberOfQuestions}
            onChange={(e) => setNumberOfQuestions(Number(e.target.value))}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-lg mb-2">Category:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500 max-h-[220px]"
          >
            <option value="">Any Category</option>
            {categories.map((cat) => (
              <option value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-lg mb-2">Difficulty:</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Any Difficulty</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-lg mb-2">Type:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">Any Type</option>
            <option value="multiple">Multiple Choice</option>
            <option value="boolean">True/False</option>
          </select>
        </div>
        <button
          onClick={startQuiz}
          className="w-full py-3 mt-4 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
};

export default HomePage;
