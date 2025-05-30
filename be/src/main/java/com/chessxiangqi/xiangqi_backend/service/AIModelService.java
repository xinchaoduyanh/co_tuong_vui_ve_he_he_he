package com.chessxiangqi.xiangqi_backend.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.chessxiangqi.xiangqi_backend.model.AIModel;
import com.chessxiangqi.xiangqi_backend.repository.AIModelRepository;

@Service
public class AIModelService {
    @Autowired
    private AIModelRepository aiModelRepository;

    public List<AIModel> getAllAIModels() {
        return aiModelRepository.findAll();
    }

    public Optional<AIModel> getAIModelById(String id) {
        return aiModelRepository.findById(id);
    }

    public AIModel createAIModel(AIModel aiModel) {
        return aiModelRepository.save(aiModel);
    }

    public AIModel updateAIModel(String id, AIModel aiModel) {
        aiModel.setId(id);
        return aiModelRepository.save(aiModel);
    }

    public void deleteAIModel(String id) {
        aiModelRepository.deleteById(id);
    }
} 