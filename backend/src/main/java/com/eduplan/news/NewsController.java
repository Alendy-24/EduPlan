package com.eduplan.news;

import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/noticias")
@CrossOrigin(origins = "http://localhost:3005")
public class NewsController {

    private final RssNewsService newsService;

    public NewsController(RssNewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public List<NewsItem> getNoticias() {
        return newsService.getNoticias();
    }
}